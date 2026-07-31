---
name: model-recommendation-logic
description: Use when changing how Local Model Advisor sizes, filters, scores, or fetches models (src/models/*, src/hardware.ts) — documents the estimation constants, fit-tier rules, fallback catalog policy, and the TDD requirement
---

# Model Recommendation Logic — Domain Rules

The recommendation engine's correctness IS the product. Every change here follows TDD: failing vitest test first (`npx vitest run <file>`), then implementation.

## Module map

| File | Role | Tests |
|---|---|---|
| `src/models/estimate.ts` | name → param count → size | `estimate.test.ts` |
| `src/models/score.ts` | hardware fit tiers + ranking | `score.test.ts` |
| `src/models/fetch.ts` | HF API + fallback + orchestration | `fetch.test.ts` (fetch mocked via `vi.stubGlobal`) |
| `src/models/catalog.json` | bundled offline fallback | covered by fetch tests |
| `src/models/types.ts` | all shared interfaces + webview protocol | — |
| `src/hardware.ts` | `scanHardware()` shell + pure `deriveHardware()` | `hardware.test.ts` (test the pure function only; never mock `systeminformation` internals) |

Pure logic never imports `vscode` or `systeminformation` — keep shells thin so vitest can run everything fast.

## Constants (change = update tests + the UI footnote in `src/webview/main.ts`)

- **Size**: Q4 quantization ≈ `0.6 GB` per billion params, 1 decimal.
- **Parsing order matters**: MoE pattern (`8x7B` → 56) BEFORE single pattern (`(\d+(?:\.\d+)?)\s*b\b`), otherwise `8x7B` reads as 7. The `\b` guard stops `8bit` matching as 8B. Unsized names return `null` and are skipped from live results.
- **Fit tiers** (`classifyFit`): `gpu` if `size + 0.8 ≤ vramGB`; else `hybrid` if fits CPU and `vramGB ≥ 4`; else `cpu` if `size + 2 ≤ ramGB × 0.75`; else `none` (dropped).
- **Score**: tier weight (gpu 3000 / hybrid 2000 / cpu 1000) + `log10(downloads+1) × 100`; top 12 returned. Tier always dominates popularity — a change that lets downloads outrank fit is a bug.
- **Apple silicon**: unified memory → `vramGB = ramGB × 0.65` (driver-reported VRAM is meaningless there).
- **Virtual GPUs** (`basic render|virtual|remote|parsec`) are filtered out before picking the best controller.

## Data source policy

- Two live sources, fetched in parallel via `Promise.allSettled` and merged: Hugging Face (`https://huggingface.co/api/models?filter=gguf&sort=downloads&limit=100`) and GPT4All (`https://gpt4all.io/models/models3.json`, no auth). Both use `TIMEOUT_MS` (10s, `src/models/constants.ts`). HF's token is optional `Authorization: Bearer` from SecretStorage (`src/secrets.ts`) — never logged or persisted anywhere else. GPT4All has no auth.
- GPT4All rows whose `url` isn't a `huggingface.co/{owner}/{repo}/resolve/...` link are skipped entirely (some entries self-host on `gpt4all.io`) — there's no HF repo to power the "Open on Hugging Face" button or the `ollama run hf.co/{modelId}` copy command for those.
- GPT4All's `estimatedSizeGB` comes from the catalog's own real `filesize` (bytes → GiB), not the `paramsB × Q4_GB_PER_B` estimate used for HF — it's a measured file, not a guess. `minRamGB`, however, is always computed with the project's own formula (`ceil((size + CPU_OVERHEAD_GB) / (1 - OS_RESERVE_FRACTION))`) for every source, including GPT4All — never a source's own RAM-requirement field. Mixing methodologies across sources would reintroduce cross-source inconsistency.
- GPT4All entries get `downloads: 0, likes: 0` (the catalog has no popularity data) — deliberately not faked. Tier always dominates popularity, so a GPT4All entry only displaces an HF entry within the same tier when there's room left after more-downloaded HF entries; this is correct, honest behavior.
- The merged live pool is de-duplicated by `dedupeByName` (`src/models/dedupe.ts`) before scoring, collapsing re-packaged/duplicate listings of the same underlying model and keeping the highest-download variant.
- Live results only fall back to `catalog.json` when **both** sources fail (or return nothing); the UI shows the amber OFFLINE banner via `source: 'fallback'`. Never let a network error reach the user as a raw exception. If either source succeeds, its results are used and `source: 'live'`.
- `catalog.json` entries store `paramsB` explicitly (bypasses name parsing — see Phi-3.5-mini). **Before each release**: refresh download counts and swap in currently-popular models; keep ≥10 entries spanning ~1B to ~56B so every hardware class gets results.
