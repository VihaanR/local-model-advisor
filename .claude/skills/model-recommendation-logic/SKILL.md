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

- Live: `https://huggingface.co/api/models?filter=gguf&sort=downloads&limit=100`, 10s timeout, optional `Authorization: Bearer` from SecretStorage (`src/secrets.ts`) — token must never be logged or persisted anywhere else.
- ANY fetch failure silently falls back to `catalog.json`; the UI shows the amber OFFLINE banner via `source: 'fallback'`. Never let a network error reach the user as a raw exception.
- `catalog.json` entries store `paramsB` explicitly (bypasses name parsing — see Phi-3.5-mini). **Before each release**: refresh download counts and swap in currently-popular models; keep ≥10 entries spanning ~1B to ~56B so every hardware class gets results.
