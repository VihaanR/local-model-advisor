# Local Model Advisor — Design & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current OutputChannel prototype into a marketplace-publishable VS Code extension that scans CPU/RAM/GPU and presents ranked, hardware-fit local AI model recommendations in a neon-terminal Webview.

**Architecture:** Pure logic (size estimation, fit scoring, catalog) lives in small tested modules under `src/models/`; side-effectful shells (`hardware.ts`, `fetch.ts`, `panel.ts`, `extension.ts`) stay thin. A second esbuild bundle produces the webview frontend (`dist/webview.js` + `dist/styles.css`), which talks to the extension host over a typed postMessage protocol. Live data comes from the Hugging Face API with a bundled offline catalog as fallback.

**Tech Stack:** TypeScript 5.9 (strict), esbuild dual-bundle (node/cjs extension + browser/iife webview), `systeminformation` (hardware), Hugging Face REST API (no SDK), Vitest (unit tests), `@vscode/test-electron` (smoke test), vanilla TS + hand-rolled neon CSS webview (no framework, no CDN), `vsce` (packaging).

---

## BUILD STATUS — updated 2026-07-31 (fix wave 2 landed; Task 13 planned, not started)

### 🔴 RESUME HERE (next session)

**Tasks 1–12 are COMPLETE, reviewed and pushed. [Task 13](#task-13-sidebar-view-paginated-results-and-sorting---planned-not-started) is planned but NOT started — it is the next piece of work.**

Fix wave 2 closed every outstanding item from the original scope: all 11 D3 minors, both D5 tripwires, Task 11's workflows, and D6's skill checklist. Test suite grew from 7 files / 47 tests to **9 files / 74 tests**, all green, and everything is pushed to `origin/master`.

To resume:

1. **Implement [Task 13](#task-13-sidebar-view-paginated-results-and-sorting---planned-not-started)** — sidebar webview (replacing the editor tab), all fitting models paginated 25 per page behind a numbered pager, and a 9-option sort dropdown. A 0.2.0 minor release. Start at its Step 1; the decisions table near the top is already settled with the user and should not be relitigated.
2. **D4 — work this environment cannot do** (both need a GUI; `code` is still not on PATH here). ⚠️ **Do these *after* Task 13**, not before: Task 13 replaces the editor tab with a sidebar, so a screenshot captured now would be obsolete immediately.
   - Capture `media/screenshot.png` of the **sidebar** and re-add `![screenshot](media/screenshot.png)` to `README.md`. The broken reference was removed from the README on 2026-07-31 (the file never existed), so nothing renders broken in the meantime. When re-adding: vsce rewrites the relative path to `https://raw.githubusercontent.com/VihaanR/local-model-advisor/HEAD/media/screenshot.png`, so the PNG must be committed **and pushed** — being inside the `.vsix` is not enough.
   - `code --install-extension local-model-advisor-<version>.vsix` (0.2.0 once Task 13 lands), then open the sidebar once from the installed build.
3. **Task 11 Step 3 — external accounts only**: create the Marketplace publisher (ID must match `publisher: "vihaan-raut"` in `package.json`) and an Azure DevOps PAT. Then either `npx vsce login vihaan-raut && npx vsce publish`, or add the PAT as the `VSCE_PAT` repo secret and run the Publish workflow. The workflows themselves are written and committed.

Nothing in Part D is outstanding any more except D4.

### Repo state

- **Remote:** `origin` → `https://github.com/VihaanR/local-model-advisor.git`, already pushed. `master` is the GitHub default branch.
- **Local branch:** `master`, tracking `origin/master`, **in sync as of 2026-07-31** — Task 12 and fix wave 2 are both pushed (through `8a12744`). Verify with `git log origin/master..HEAD` before assuming otherwise.
- **`.gitignore`:** broadened beyond the original 5-line version — now also excludes `coverage/`, `*.tsbuildinfo`, logs, `.env*`, OS cruft, and `.superpowers/` (Claude Code session scratch: task briefs, review diffs, progress ledger — intentionally never committed). `.claude/skills/**` is deliberately NOT ignored — those 3 files are checked-in project skills, not scratch.
- **Git identity in this repo:** `VihaanR <vihaanmehulraut@gmail.com>` — already the configured `user.name`/`user.email`, so new commits are attributed correctly without any extra action.

**Tasks 1–10: ✅ COMPLETE.** All implemented, independently reviewed per task, and committed. The extension runs end to end: scan → tiered recommendations → neon webview.

Verified by the controller after Task 10 (state as of commit `367cdf6`):

| Check | Result |
|---|---|
| `npm run compile` | clean (tsc + eslint + dual esbuild bundle) |
| `npm run test:unit` | 4 files, 20 tests, all passing |
| `npm test` (real Electron host) | 1 passing, both commands registered |
| `npx vsce package` | `local-model-advisor-0.1.0.vsix`, 10 files, no dev files leaked |

Re-verified independently by the task reviewer after fix wave 1 (state as of commit `ccb4613`):

| Check | Result |
|---|---|
| `npm run check-types` | clean |
| `npm run lint` | clean |
| `npm run test:unit` | **5 files, 37 tests, all passing** (was 4/20 — fix wave added `state.test.ts` + expanded `fetch.test.ts`/`estimate.test.ts`) |
| `npm run compile` | clean (full pipeline) |
| `npm test` (real Electron host) | passing (trusted from implementer report — reviewer skipped re-running it deliberately, it launches a real VS Code download and is slow/flaky in a sandbox; `src/test/extension.test.ts` is untouched in the diff) |
| `npx vsce package` | not re-run since `367cdf6` — do this again before any publish, since `catalog.json` and other bundled files changed |

**Task 11: ✅ WORKFLOWS COMMITTED / ⏸️ publish still gated externally** — `.github/workflows/ci.yml` and `publish.yml` exist and are committed (Steps 1, 2, 4 done). Only Step 3 remains: a Marketplace publisher ID and an Azure DevOps PAT, which are account-creation tasks, not code.

**All code work in this plan is now DONE.** Fix wave 1 closed the 7 Critical+Important findings (webview lifecycle, disposal safety, concurrency guard, constants unification, error classification, catalog query quality, test coverage). Fix wave 2 closed everything else implementable: all 11 D3 minors, both D5 tripwires, Task 11's workflows, and D6's skill checklist. See **[Part D](#part-d--outstanding-work-post-review)** — D1, D2, D3, D5 and D6 are all resolved; **D4 (2 human-only tasks) is the only outstanding item**, alongside Task 11 Step 3's external accounts.

Verified after fix wave 2 (all re-run in this session, not trusted from any report):

| Check | Result |
|---|---|
| `npm run check-types` | clean — **now type-checks two projects** (host + webview) |
| `npm run lint` | clean |
| `npm run test:unit` | **9 files, 74 tests, all passing** (was 7/47) |
| `npm run compile` | clean (full pipeline, no esbuild warnings) |
| `npm test` (real Electron host) | 1 passing — re-run for real after hardening the assertion |
| `npx vsce package` | `local-model-advisor-0.1.0.vsix`, 10 files, 124.85 KB, no dev files leaked |

### Task completion map

| Task | Status | Commit(s) |
|---|---|---|
| 1 — Manifest repair | ✅ | `a00b89b` |
| 2 — Vitest infra + size estimation | ✅ | `9c66b3a` (+ `aa047a4` skipLibCheck fix) |
| 3 — Shared types + fit scoring | ✅ | `a9dc191` |
| 4 — Fetch layer + offline catalog | ✅ | `214f877` |
| 5 — Hardware scanner | ✅ | `9c72bc3` |
| 6 — HF token via SecretStorage | ✅ | `cad3032` |
| 7 — Dual bundle + webview panel | ✅ | `a5112cc` |
| 8 — Neon UI frontend | ✅ | `6ec7fee` |
| 9 — Wire end-to-end | ✅ | `e109e0a` |
| 10 — Marketplace assets & docs | ✅ | `5922818` (+ `367cdf6` exclude CLAUDE.md) |
| 11 — CI + publish | ✅ workflows done (Steps 1/2/4); Step 3 needs external accounts | fix wave 2 |
| *(post-review)* Final whole-branch review | ✅ ran, found 18 findings | — (review only, no fix commits yet) |
| *(post-review)* docs: status update in this file | ✅ | `fb038a5` |
| *(post-review)* chore: broaden .gitignore | ✅ | `dc4eee6` |
| *(post-review)* Push to GitHub remote | ✅ | — (push, not a commit) |
| *(post-review)* docs: resume-here + repo-state update | ✅ | `de95372` |
| *(post-review)* **Fix wave 1: C1 + I1–I6 (all 7 ship-blocking findings)** | ✅ implemented + independently reviewed, approved | `ccb4613` |
| *(post-review)* docs: fix wave 1 status updates | ✅ | `62367ec`, `14b3677` |
| *(post-review)* docs: Task 12 plan added | ✅ | `bd9ccb7` |
| **12 — GPT4All second live source** | ✅ implemented + independently reviewed, approved | `dd87c02` |
| *(post-review)* **Fix wave 2: all 11 D3 minors + D5 + D6 + Task 11 workflows** | ✅ implemented, full pipeline re-verified | `0d0e729`, `711ac45`, `8a12744` |
| **13 — Sidebar view, pagination, sorting** | 📋 planned, not started | — |

Full commit range so far: `c136d34` (baseline) .. `dd87c02` (latest), 21 commits, all on `master`. **20 of 21 pushed to `origin`; `dd87c02` is local-only, waiting on a push decision.**

Deviations from this plan that were made deliberately during execution, and why:

1. **`skipLibCheck: true` added to `tsconfig.json`** (`aa047a4`) — vitest ships ESM-only `.d.cts` declarations that `tsc` rejects under `module: Node16`, breaking `npm run compile` project-wide. Not anticipated by this plan.
2. **`src/test/extension.test.ts` calls `extension.activate()`** before `getCommands()` — the plan's literal test could never pass, because a VS Code test host does not eagerly activate the extension, so declared-but-unregistered commands never enter the registry.
3. **`@vscode/vsce` added as a devDependency** — bare `npx vsce` resolves to the deprecated `vsce@2.15.0`, which hard-fails on this manifest's (intentionally absent) `activationEvents` field.
4. **`.superpowers/**` and `CLAUDE.md` added to `.vscodeignore`** — both were leaking into the `.vsix`; neither was on this plan's exclude list.
5. **`media/screenshot.png` was never captured** — requires a GUI. Still open; see Part D.

---

## Global Constraints

- `engines.vscode` must be `^1.120.0` (matches `@types/vscode ^1.120.0`). The current `^1.000.0` is a typo and must not survive.
- Webview must load **zero external resources** — no CDN scripts, no Google Fonts, no remote images. Strict CSP with nonce. This is both a security requirement and a marketplace-review requirement.
- No API key is ever hardcoded or committed. HF token → VS Code `SecretStorage`. Marketplace PAT → `vsce login` / GitHub Actions secret only.
- All pure logic gets a unit test **before** implementation (TDD). Vitest tests live next to the code (`src/models/*.test.ts`); the VS Code integration test stays in `src/test/`.
- UI aesthetic: neon terminal / CRT — **not** default-Tailwind-looking. Palette and effects defined in Task 8; future UI work must follow `.claude/skills/neon-webview-ui`.
- Commit after every task (messages given per task).

---

## Part A — Starting-state audit (historical; describes the code BEFORE Tasks 1–10 ran)

> Kept for provenance. Every "Not built" / "broken" item below has since been fixed — see the Build Status table above.

| Area | State |
|---|---|
| Scaffold | Yeoman VS Code extension scaffold: esbuild bundling, eslint flat config, `@vscode/test-cli` harness. Never committed — working tree is 100% untracked on `master`. |
| `src/extension.ts` | Working command `local-model-advisor.scanHardware`: scans CPU/RAM/GPU via `systeminformation`, prints a text table of models to an **OutputChannel**. The "unclosed try block" noted in CLAUDE.md is already fixed. |
| `src/fetchModels.ts` | Fetches top-100 GGUF models from HF API sorted by downloads, estimates size from the parameter count in the model name (`0.6 GB/B` ≈ Q4), filters by RAM, returns top 10. |
| `src/test/extension.test.ts` | Untouched scaffold sample test. No real tests exist. |
| `package.json` | Broken/incomplete: `engines.vscode: "^1.000.0"` (typo), `"test": "vscode-   "` (corrupted), deprecated explicit `activationEvents`, no publisher/repo/icon/keywords/license — not publishable as-is. |

**Gaps to close (what this plan implements):** Webview UI (currently OutputChannel), GPU/VRAM-aware scoring (GPU detected but unused), MoE + word-boundary-safe size parsing, offline fallback catalog, HF token support, real tests, marketplace metadata/assets, CI.

---

## Part B — API keys & secrets (where, and how the developer provides them)

**1. Hugging Face token — OPTIONAL, runtime.**
The public model-listing endpoint needs no auth; a token raises rate limits and future-proofs gated-model metadata.
- **Never in code.** Stored in VS Code `SecretStorage` (OS keychain-backed) under key `localModelAdvisor.hfToken`.
- **How you (the developer/user) provide it:** Command Palette → `Local Model Advisor: Set Hugging Face Token` → paste token (input is masked). Submit empty to clear it. Get a token at https://huggingface.co/settings/tokens (a `read` token is sufficient).
- Code path: `secrets.ts` (Task 6) reads it; `fetch.ts` adds `Authorization: Bearer <token>` only if present.

**2. VS Code Marketplace PAT — publish-time only, never touches the codebase.**
- Create at https://dev.azure.com → User settings → Personal Access Tokens → Organization: **All accessible organizations**, Scope: **Marketplace → Manage**.
- **How you provide it:** locally, `npx vsce login <publisher-id>` (prompts for the PAT, stores it in your OS credential store); in CI, GitHub repo → Settings → Secrets → Actions → new secret `VSCE_PAT` (Task 11's workflow reads it).

**3. Nothing else needs a key.** Hardware scanning (`systeminformation`) and Ollama run-commands are fully local.

---

## Part C — Target file structure

```
src/
  extension.ts            activation + command wiring only (thin)
  hardware.ts             scanHardware() shell + deriveHardware() pure transform
  secrets.ts              HF token get/set via SecretStorage
  panel.ts                AdvisorPanel: webview lifecycle, CSP, typed messaging
  models/
    types.ts              all shared interfaces + webview message protocol
    estimate.ts           pure: parseParamCount, estimateSizeGB     [unit tested]
    score.ts              pure: classifyFit, scoreModels            [unit tested]
    fetch.ts              HF API + fallback catalog + orchestration [unit tested, fetch mocked]
    catalog.json          bundled offline fallback (~12 curated models)
  webview/
    main.ts               frontend script (browser bundle, no vscode imports)
    styles.css            neon design system
  test/
    extension.test.ts     VS Code smoke test (command registered)
media/
  icon.svg                source; icon.png rendered from it (Task 10)
scripts/
  render-icon.mjs         sharp-based svg→png
.github/workflows/
  ci.yml, publish.yml     Task 11
```

---

# Implementation Tasks

### Task 1: Baseline commit + manifest repair

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: valid manifest with commands `local-model-advisor.scanHardware` and `local-model-advisor.setHuggingFaceToken`; `tsconfig` with `include: ["src"]`, `resolveJsonModule`, `DOM` lib — later tasks assume all three.

- [ ] **Step 1: Baseline commit of the existing scaffold (nothing is committed yet)**

```bash
git add -A
git commit -m "chore: baseline scaffold with OutputChannel prototype"
```

- [ ] **Step 2: Replace `package.json` with the repaired manifest**

```json
{
  "name": "local-model-advisor",
  "displayName": "Local Model Advisor",
  "description": "Scan your CPU, RAM and GPU — get ranked local AI models (GGUF) that actually fit your machine, with one-click Ollama run commands.",
  "version": "0.0.1",
  "publisher": "vihaan-raut",
  "license": "MIT",
  "icon": "media/icon.png",
  "galleryBanner": { "color": "#05060a", "theme": "dark" },
  "engines": { "vscode": "^1.120.0" },
  "categories": ["Machine Learning", "Other"],
  "keywords": ["llm", "local ai", "ollama", "gguf", "huggingface", "hardware", "model advisor"],
  "repository": { "type": "git", "url": "https://github.com/VihaanR/local-model-advisor" },
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "local-model-advisor.scanHardware",
        "title": "Local Model Advisor: Scan Hardware & Recommend Models"
      },
      {
        "command": "local-model-advisor.setHuggingFaceToken",
        "title": "Local Model Advisor: Set Hugging Face Token"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "npm run check-types && npm run lint && node esbuild.js",
    "watch": "npm-run-all -p watch:*",
    "watch:esbuild": "node esbuild.js --watch",
    "watch:tsc": "tsc --noEmit --watch --project tsconfig.json",
    "package": "npm run check-types && npm run lint && node esbuild.js --production",
    "compile-tests": "tsc -p . --outDir out",
    "watch-tests": "tsc -p . -w --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    "check-types": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vscode-test",
    "test:unit": "vitest run"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.10",
    "@types/node": "22.x",
    "@types/vscode": "^1.120.0",
    "@vscode/test-cli": "^0.0.12",
    "@vscode/test-electron": "^2.5.2",
    "esbuild": "^0.27.3",
    "eslint": "^9.39.3",
    "npm-run-all": "^4.1.5",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.56.1"
  },
  "dependencies": {
    "systeminformation": "^5.31.7"
  }
}
```

Notes baked in: `engines` fixed to `^1.120.0`; corrupted `test` script fixed to `vscode-test`; deprecated `activationEvents` **removed entirely** (VS Code ≥1.75 infers activation from `contributes.commands`); `publisher` is a placeholder ID — **it must exactly match the publisher ID you create in Task 11's runbook** (change both together if you pick a different one).

- [ ] **Step 3: Replace `tsconfig.json`**

```json
{
	"compilerOptions": {
		"module": "Node16",
		"target": "ES2022",
		"lib": ["ES2022", "DOM"],
		"sourceMap": true,
		"rootDir": "src",
		"strict": true,
		"resolveJsonModule": true
	},
	"include": ["src"]
}
```

Why: `DOM` lib is needed by `src/webview/main.ts` (Task 7); `resolveJsonModule` by `catalog.json` import (Task 4); `include: ["src"]` keeps root-level `vitest.config.ts` (Task 2) out of the `rootDir` check.

- [ ] **Step 4: Verify**

Run: `npm run compile`
Expected: exits 0, `dist/extension.js` produced.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json
git commit -m "fix: repair manifest (engines typo, corrupted test script) and add marketplace metadata"
```

---

### Task 2: Unit-test infrastructure + size estimation (TDD)

**Files:**
- Create: `vitest.config.ts`, `src/models/estimate.ts`, `src/models/estimate.test.ts`

**Interfaces:**
- Produces: `parseParamCount(modelId: string): number | null` (billions of params, MoE-aware) and `estimateSizeGB(paramsB: number): number` (Q4 ≈ 0.6 GB/B, 1 decimal). Tasks 4 and 8 depend on these exact names.

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['src/test/**', 'node_modules/**'],
	},
});
```

(`src/test/**` is excluded because it holds the VS Code-host integration test, which vitest cannot run.)

- [ ] **Step 3: Write the failing test — `src/models/estimate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseParamCount, estimateSizeGB } from './estimate';

describe('parseParamCount', () => {
	it('parses a plain size like 8B', () => {
		expect(parseParamCount('meta-llama/Meta-Llama-3.1-8B-Instruct-GGUF')).toBe(8);
	});
	it('parses decimal sizes like 1.1B', () => {
		expect(parseParamCount('TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF')).toBe(1.1);
	});
	it('does not mistake version numbers (3.1, v0.1) for sizes', () => {
		expect(parseParamCount('Qwen/Qwen2.5-Coder-32B-Instruct-GGUF')).toBe(32);
	});
	it('handles MoE names: 8x7B totals 56', () => {
		expect(parseParamCount('TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF')).toBe(56);
	});
	it('does not match "8bit" as 8B (word boundary)', () => {
		expect(parseParamCount('someone/model-8bit-GGUF')).toBeNull();
	});
	it('returns null when no size is present', () => {
		expect(parseParamCount('microsoft/phi-4-gguf')).toBeNull();
	});
});

describe('estimateSizeGB', () => {
	it('uses ~0.6 GB per billion params (Q4), 1 decimal', () => {
		expect(estimateSizeGB(8)).toBe(4.8);
		expect(estimateSizeGB(1.1)).toBe(0.7);
		expect(estimateSizeGB(56)).toBe(33.6);
	});
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx vitest run src/models/estimate.test.ts`
Expected: FAIL — cannot resolve `./estimate`.

- [ ] **Step 5: Implement `src/models/estimate.ts`**

```ts
const MOE_PATTERN = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/i;
const SINGLE_PATTERN = /(\d+(?:\.\d+)?)\s*b\b/i;

/** Billions of parameters parsed from a model id, or null if the name carries no size. */
export function parseParamCount(modelId: string): number | null {
	// MoE first: "8x7B" would otherwise be read as 7B by the single pattern.
	const moe = modelId.match(MOE_PATTERN);
	if (moe) {
		return parseInt(moe[1], 10) * parseFloat(moe[2]);
	}
	const single = modelId.match(SINGLE_PATTERN);
	if (single) {
		return parseFloat(single[1]);
	}
	return null;
}

/** Approximate on-disk/in-memory size at Q4 quantization: ~0.6 GB per billion params. */
export function estimateSizeGB(paramsB: number): number {
	return Math.round(paramsB * 0.6 * 10) / 10;
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/models/estimate.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/models/estimate.ts src/models/estimate.test.ts package.json package-lock.json
git commit -m "feat: MoE-aware, word-boundary-safe model size estimation with vitest infra"
```

---

### Task 3: Shared types + fit scoring (TDD)

**Files:**
- Create: `src/models/types.ts`, `src/models/score.ts`, `src/models/score.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (types are self-contained).
- Produces: every interface below — **all later tasks import from `src/models/types.ts` verbatim** — plus `classifyFit(sizeGB: number, hw: HardwareInfo): FitTier` and `scoreModels(models: ModelRecommendation[], hw: HardwareInfo): ScoredModel[]` (sorted desc, `none` tier dropped, top 12).

- [ ] **Step 1: Create `src/models/types.ts`**

```ts
export type FitTier = 'gpu' | 'hybrid' | 'cpu' | 'none';

export interface HardwareInfo {
	cpuModel: string;
	physicalCores: number;
	ramGB: number;
	gpuModel: string | null;
	vramGB: number;
}

export interface ModelRecommendation {
	name: string;
	modelId: string;
	paramsB: number;
	estimatedSizeGB: number;
	minRamGB: number;
	downloads: number;
	likes: number;
	hfUrl: string;
}

export interface ScoredModel extends ModelRecommendation {
	tier: FitTier;
	score: number;
}

export type CatalogSource = 'live' | 'fallback';

export type ExtensionToWebview =
	| { type: 'scanning' }
	| { type: 'hardware'; hardware: HardwareInfo }
	| { type: 'models'; models: ScoredModel[]; source: CatalogSource }
	| { type: 'error'; message: string };

export type WebviewToExtension =
	| { type: 'rescan' }
	| { type: 'openExternal'; url: string }
	| { type: 'copy'; text: string };
```

- [ ] **Step 2: Write the failing test — `src/models/score.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { classifyFit, scoreModels } from './score';
import type { HardwareInfo, ModelRecommendation } from './types';

const rig = (ramGB: number, vramGB: number): HardwareInfo => ({
	cpuModel: 'Test CPU', physicalCores: 8, ramGB, gpuModel: vramGB > 0 ? 'Test GPU' : null, vramGB,
});

const model = (id: string, sizeGB: number, downloads: number): ModelRecommendation => ({
	name: id, modelId: `test/${id}`, paramsB: sizeGB / 0.6, estimatedSizeGB: sizeGB,
	minRamGB: Math.ceil(sizeGB + 2), downloads, likes: 0, hfUrl: `https://huggingface.co/test/${id}`,
});

describe('classifyFit', () => {
	it('gpu when model + context headroom fits in VRAM', () => {
		expect(classifyFit(6, rig(16, 8))).toBe('gpu');
	});
	it('hybrid when it overflows VRAM but fits RAM and VRAM >= 4GB', () => {
		expect(classifyFit(10, rig(16, 8))).toBe('hybrid');
	});
	it('cpu when no usable GPU but fits in 75% of RAM with 2GB overhead', () => {
		expect(classifyFit(9, rig(16, 0))).toBe('cpu');
	});
	it('none when it cannot fit anywhere', () => {
		expect(classifyFit(11, rig(16, 0))).toBe('none');
	});
});

describe('scoreModels', () => {
	it('ranks gpu tier above cpu tier regardless of downloads', () => {
		const hw = rig(32, 8);
		const out = scoreModels([model('big-cpu', 15, 9_000_000), model('small-gpu', 5, 1_000)], hw);
		expect(out[0].name).toBe('small-gpu');
	});
	it('drops none-tier models and caps at 12 results', () => {
		const hw = rig(8, 0);
		const many = Array.from({ length: 20 }, (_, i) => model(`m${i}`, 2, i));
		const out = scoreModels([...many, model('whale', 40, 999)], hw);
		expect(out).toHaveLength(12);
		expect(out.some((m) => m.name === 'whale')).toBe(false);
	});
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/models/score.test.ts`
Expected: FAIL — cannot resolve `./score`.

- [ ] **Step 4: Implement `src/models/score.ts`**

```ts
import type { FitTier, HardwareInfo, ModelRecommendation, ScoredModel } from './types';

const CTX_HEADROOM_GB = 0.8;     // KV-cache/context room on top of weights
const CPU_OVERHEAD_GB = 2;       // runtime + context when running on CPU
const OS_RESERVE_FRACTION = 0.25; // leave a quarter of RAM to the OS
const MAX_RESULTS = 12;

const TIER_WEIGHT: Record<FitTier, number> = { gpu: 3000, hybrid: 2000, cpu: 1000, none: 0 };

export function classifyFit(sizeGB: number, hw: HardwareInfo): FitTier {
	const usableRamGB = hw.ramGB * (1 - OS_RESERVE_FRACTION);
	if (hw.vramGB > 0 && sizeGB + CTX_HEADROOM_GB <= hw.vramGB) {
		return 'gpu';
	}
	const fitsCpu = sizeGB + CPU_OVERHEAD_GB <= usableRamGB;
	if (fitsCpu && hw.vramGB >= 4) {
		return 'hybrid';
	}
	if (fitsCpu) {
		return 'cpu';
	}
	return 'none';
}

export function scoreModels(models: ModelRecommendation[], hw: HardwareInfo): ScoredModel[] {
	return models
		.map((m): ScoredModel => {
			const tier = classifyFit(m.estimatedSizeGB, hw);
			return { ...m, tier, score: TIER_WEIGHT[tier] + Math.log10(m.downloads + 1) * 100 };
		})
		.filter((m) => m.tier !== 'none')
		.sort((a, b) => b.score - a.score)
		.slice(0, MAX_RESULTS);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/models/score.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/models/types.ts src/models/score.ts src/models/score.test.ts
git commit -m "feat: VRAM/RAM-aware fit tiers and ranking"
```

---

### Task 4: Fetch layer with offline fallback catalog (TDD)

**Files:**
- Create: `src/models/catalog.json`, `src/models/fetch.ts`, `src/models/fetch.test.ts`
- Delete (in Task 9): `src/fetchModels.ts` stays untouched for now so the extension keeps compiling.

**Interfaces:**
- Consumes: `parseParamCount`/`estimateSizeGB` (Task 2), `scoreModels` (Task 3), types (Task 3).
- Produces: `fetchLiveModels(opts?: { token?: string; signal?: AbortSignal }): Promise<ModelRecommendation[]>`, `loadFallbackCatalog(): ModelRecommendation[]`, `getRecommendations(hw: HardwareInfo, opts?: { token?: string }): Promise<{ models: ScoredModel[]; source: CatalogSource }>`. Task 9 calls `getRecommendations` exactly like this.

- [ ] **Step 1: Create `src/models/catalog.json`** (curated fallback; refresh download counts before each release — see `.claude/skills/model-recommendation-logic`)

```json
[
	{ "name": "Llama-3.2-3B-Instruct-GGUF", "modelId": "bartowski/Llama-3.2-3B-Instruct-GGUF", "paramsB": 3, "estimatedSizeGB": 1.8, "minRamGB": 4, "downloads": 1500000, "likes": 700, "hfUrl": "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF" },
	{ "name": "Meta-Llama-3.1-8B-Instruct-GGUF", "modelId": "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF", "paramsB": 8, "estimatedSizeGB": 4.8, "minRamGB": 7, "downloads": 2400000, "likes": 1100, "hfUrl": "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF" },
	{ "name": "Qwen2.5-7B-Instruct-GGUF", "modelId": "Qwen/Qwen2.5-7B-Instruct-GGUF", "paramsB": 7, "estimatedSizeGB": 4.2, "minRamGB": 7, "downloads": 900000, "likes": 500, "hfUrl": "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF" },
	{ "name": "Qwen2.5-Coder-32B-Instruct-GGUF", "modelId": "Qwen/Qwen2.5-Coder-32B-Instruct-GGUF", "paramsB": 32, "estimatedSizeGB": 19.2, "minRamGB": 22, "downloads": 700000, "likes": 900, "hfUrl": "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct-GGUF" },
	{ "name": "Mistral-7B-Instruct-v0.3-GGUF", "modelId": "bartowski/Mistral-7B-Instruct-v0.3-GGUF", "paramsB": 7, "estimatedSizeGB": 4.2, "minRamGB": 7, "downloads": 800000, "likes": 400, "hfUrl": "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF" },
	{ "name": "gemma-2-9b-it-GGUF", "modelId": "bartowski/gemma-2-9b-it-GGUF", "paramsB": 9, "estimatedSizeGB": 5.4, "minRamGB": 8, "downloads": 600000, "likes": 350, "hfUrl": "https://huggingface.co/bartowski/gemma-2-9b-it-GGUF" },
	{ "name": "gemma-2-27b-it-GGUF", "modelId": "bartowski/gemma-2-27b-it-GGUF", "paramsB": 27, "estimatedSizeGB": 16.2, "minRamGB": 19, "downloads": 300000, "likes": 250, "hfUrl": "https://huggingface.co/bartowski/gemma-2-27b-it-GGUF" },
	{ "name": "DeepSeek-R1-Distill-Qwen-7B-GGUF", "modelId": "bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF", "paramsB": 7, "estimatedSizeGB": 4.2, "minRamGB": 7, "downloads": 1100000, "likes": 800, "hfUrl": "https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF" },
	{ "name": "DeepSeek-R1-Distill-Qwen-14B-GGUF", "modelId": "bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF", "paramsB": 14, "estimatedSizeGB": 8.4, "minRamGB": 11, "downloads": 650000, "likes": 500, "hfUrl": "https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF" },
	{ "name": "Phi-3.5-mini-instruct-GGUF", "modelId": "bartowski/Phi-3.5-mini-instruct-GGUF", "paramsB": 3.8, "estimatedSizeGB": 2.3, "minRamGB": 5, "downloads": 550000, "likes": 300, "hfUrl": "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF" },
	{ "name": "TinyLlama-1.1B-Chat-v1.0-GGUF", "modelId": "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF", "paramsB": 1.1, "estimatedSizeGB": 0.7, "minRamGB": 3, "downloads": 1300000, "likes": 600, "hfUrl": "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF" },
	{ "name": "Mixtral-8x7B-Instruct-v0.1-GGUF", "modelId": "TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF", "paramsB": 56, "estimatedSizeGB": 33.6, "minRamGB": 36, "downloads": 450000, "likes": 700, "hfUrl": "https://huggingface.co/TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF" }
]
```

(Note `Phi-3.5-mini`: its name has no parseable `B` size — the catalog stores `paramsB` explicitly, which is exactly why the fallback bypasses `parseParamCount`.)

- [ ] **Step 2: Write the failing test — `src/models/fetch.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchLiveModels, loadFallbackCatalog, getRecommendations } from './fetch';
import type { HardwareInfo } from './types';

const hw: HardwareInfo = { cpuModel: 'x', physicalCores: 8, ramGB: 32, gpuModel: 'g', vramGB: 12 };

afterEach(() => vi.unstubAllGlobals());

describe('fetchLiveModels', () => {
	it('maps HF rows, skipping unsized names, and sends the token header when given', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [
				{ modelId: 'a/Llama-3.1-8B-GGUF', downloads: 100, likes: 5 },
				{ modelId: 'b/no-size-here', downloads: 999, likes: 9 },
			],
		});
		vi.stubGlobal('fetch', fetchMock);
		const out = await fetchLiveModels({ token: 'hf_test' });
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ modelId: 'a/Llama-3.1-8B-GGUF', paramsB: 8, estimatedSizeGB: 4.8, minRamGB: 7 });
		const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer hf_test');
	});
	it('throws on a non-OK response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
		await expect(fetchLiveModels()).rejects.toThrow('429');
	});
});

describe('loadFallbackCatalog', () => {
	it('returns a usable bundled catalog', () => {
		const cat = loadFallbackCatalog();
		expect(cat.length).toBeGreaterThanOrEqual(10);
		expect(cat.every((m) => m.estimatedSizeGB > 0 && m.modelId.includes('/'))).toBe(true);
	});
});

describe('getRecommendations', () => {
	it('falls back to the bundled catalog when the network fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const { models, source } = await getRecommendations(hw);
		expect(source).toBe('fallback');
		expect(models.length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/models/fetch.test.ts`
Expected: FAIL — cannot resolve `./fetch`.

- [ ] **Step 4: Implement `src/models/fetch.ts`**

```ts
import catalog from './catalog.json';
import { estimateSizeGB, parseParamCount } from './estimate';
import { scoreModels } from './score';
import type { CatalogSource, HardwareInfo, ModelRecommendation, ScoredModel } from './types';

const HF_ENDPOINT = 'https://huggingface.co/api/models?filter=gguf&sort=downloads&limit=100';
const TIMEOUT_MS = 10_000;
const CPU_OVERHEAD_GB = 2;

interface HfRow {
	modelId?: string;
	id?: string;
	downloads?: number;
	likes?: number;
}

export async function fetchLiveModels(
	opts: { token?: string; signal?: AbortSignal } = {}
): Promise<ModelRecommendation[]> {
	const headers: Record<string, string> = { 'User-Agent': 'local-model-advisor-vscode' };
	if (opts.token) {
		headers.Authorization = `Bearer ${opts.token}`;
	}
	const res = await fetch(HF_ENDPOINT, {
		headers,
		signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok) {
		throw new Error(`Hugging Face API returned ${res.status}`);
	}
	const rows = (await res.json()) as HfRow[];
	const out: ModelRecommendation[] = [];
	for (const row of rows) {
		const modelId = row.modelId ?? row.id;
		if (!modelId) {
			continue;
		}
		const paramsB = parseParamCount(modelId);
		if (paramsB === null) {
			continue;
		}
		const sizeGB = estimateSizeGB(paramsB);
		out.push({
			name: modelId.split('/').pop() ?? modelId,
			modelId,
			paramsB,
			estimatedSizeGB: sizeGB,
			minRamGB: Math.ceil(sizeGB + CPU_OVERHEAD_GB),
			downloads: row.downloads ?? 0,
			likes: row.likes ?? 0,
			hfUrl: `https://huggingface.co/${modelId}`,
		});
	}
	return out;
}

export function loadFallbackCatalog(): ModelRecommendation[] {
	return catalog as ModelRecommendation[];
}

export async function getRecommendations(
	hw: HardwareInfo,
	opts: { token?: string } = {}
): Promise<{ models: ScoredModel[]; source: CatalogSource }> {
	try {
		const live = await fetchLiveModels(opts);
		return { models: scoreModels(live, hw), source: 'live' };
	} catch {
		return { models: scoreModels(loadFallbackCatalog(), hw), source: 'fallback' };
	}
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/models/fetch.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/models/catalog.json src/models/fetch.ts src/models/fetch.test.ts
git commit -m "feat: HF fetch layer with token support and offline fallback catalog"
```

---

### Task 5: Hardware scanner (TDD on the pure transform)

**Files:**
- Create: `src/hardware.ts`, `src/hardware.test.ts`

**Interfaces:**
- Consumes: `HardwareInfo` (Task 3).
- Produces: `scanHardware(): Promise<HardwareInfo>` (thin `systeminformation` shell) and `deriveHardware(raw: RawHardware): HardwareInfo` (pure, tested). Task 9 calls `scanHardware()`.

- [ ] **Step 1: Write the failing test — `src/hardware.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { deriveHardware } from './hardware';

const GB = 1024 * 1024 * 1024;

describe('deriveHardware', () => {
	it('converts totals and picks the highest-VRAM real GPU', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'AMD', brand: 'Ryzen 7 5800X', physicalCores: 8 },
			mem: { total: 32 * GB },
			graphics: { controllers: [
				{ model: 'Microsoft Basic Render Driver', vram: 0 },
				{ model: 'NVIDIA GeForce RTX 3070', vram: 8192 },
			] },
		});
		expect(hw).toEqual({ cpuModel: 'AMD Ryzen 7 5800X', physicalCores: 8, ramGB: 32, gpuModel: 'NVIDIA GeForce RTX 3070', vramGB: 8 });
	});
	it('reports no GPU when only virtual adapters exist', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'Intel', brand: 'i5-1240P', physicalCores: 12 },
			mem: { total: 16 * GB },
			graphics: { controllers: [{ model: 'Virtual Display Adapter', vram: null }] },
		});
		expect(hw.gpuModel).toBeNull();
		expect(hw.vramGB).toBe(0);
	});
	it('treats Apple silicon unified memory as ~65% usable VRAM', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'Apple', brand: 'M3 Pro', physicalCores: 11 },
			mem: { total: 36 * GB },
			graphics: { controllers: [{ model: 'Apple M3 Pro', vram: null }] },
		});
		expect(hw.vramGB).toBeCloseTo(23.4, 1);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/hardware.test.ts`
Expected: FAIL — cannot resolve `./hardware`.

- [ ] **Step 3: Implement `src/hardware.ts`**

```ts
import si from 'systeminformation';
import type { HardwareInfo } from './models/types';

const GB = 1024 * 1024 * 1024;
const VIRTUAL_GPU = /basic render|virtual|remote|parsec/i;
const APPLE_UNIFIED_FRACTION = 0.65;

export interface RawHardware {
	cpu: { manufacturer: string; brand: string; physicalCores: number };
	mem: { total: number };
	graphics: { controllers: { model: string; vram: number | null }[] };
}

export function deriveHardware(raw: RawHardware): HardwareInfo {
	const ramGB = Math.round((raw.mem.total / GB) * 10) / 10;
	const real = raw.graphics.controllers.filter((c) => c.model && !VIRTUAL_GPU.test(c.model));
	const best = real.reduce<{ model: string; vram: number | null } | null>(
		(top, c) => (!top || (c.vram ?? 0) > (top.vram ?? 0) ? c : top),
		null
	);
	let vramGB = best?.vram ? Math.round((best.vram / 1024) * 10) / 10 : 0;
	// Apple silicon: unified memory — the GPU can address most of system RAM.
	if (/apple/i.test(raw.cpu.manufacturer)) {
		vramGB = Math.round(ramGB * APPLE_UNIFIED_FRACTION * 10) / 10;
	}
	return {
		cpuModel: `${raw.cpu.manufacturer} ${raw.cpu.brand}`.trim(),
		physicalCores: raw.cpu.physicalCores,
		ramGB,
		gpuModel: best?.model ?? null,
		vramGB,
	};
}

export async function scanHardware(): Promise<HardwareInfo> {
	const [cpu, mem, graphics] = await Promise.all([si.cpu(), si.mem(), si.graphics()]);
	return deriveHardware({
		cpu: { manufacturer: cpu.manufacturer, brand: cpu.brand, physicalCores: cpu.physicalCores },
		mem: { total: mem.total },
		graphics: { controllers: graphics.controllers.map((c) => ({ model: c.model ?? '', vram: c.vram })) },
	});
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/hardware.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hardware.ts src/hardware.test.ts
git commit -m "feat: hardware scanner with virtual-GPU filtering and Apple unified-memory handling"
```

---

### Task 6: Hugging Face token via SecretStorage

**Files:**
- Create: `src/secrets.ts`

**Interfaces:**
- Produces: `getHfToken(context: vscode.ExtensionContext): Promise<string | undefined>` and `promptAndStoreHfToken(context: vscode.ExtensionContext): Promise<void>`. Task 9 wires the latter to the `setHuggingFaceToken` command and passes the former's result into `getRecommendations`.

- [ ] **Step 1: Implement `src/secrets.ts`** (side-effect shell over the VS Code API — covered by the Task 7 smoke test, not unit-testable outside the host)

```ts
import * as vscode from 'vscode';

const HF_TOKEN_KEY = 'localModelAdvisor.hfToken';

export function getHfToken(context: vscode.ExtensionContext): Promise<string | undefined> {
	return Promise.resolve(context.secrets.get(HF_TOKEN_KEY));
}

export async function promptAndStoreHfToken(context: vscode.ExtensionContext): Promise<void> {
	const token = await vscode.window.showInputBox({
		title: 'Hugging Face Token (optional — raises API rate limits)',
		prompt: 'Paste a read token from huggingface.co/settings/tokens. Leave empty and press Enter to clear the stored token.',
		password: true,
		ignoreFocusOut: true,
	});
	if (token === undefined) {
		return; // user pressed Esc
	}
	if (token.trim() === '') {
		await context.secrets.delete(HF_TOKEN_KEY);
		void vscode.window.showInformationMessage('Local Model Advisor: Hugging Face token cleared.');
		return;
	}
	await context.secrets.store(HF_TOKEN_KEY, token.trim());
	void vscode.window.showInformationMessage('Local Model Advisor: Hugging Face token saved securely.');
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run check-types`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/secrets.ts
git commit -m "feat: optional HF token stored in VS Code SecretStorage"
```

---

### Task 7: Dual esbuild bundle + webview panel skeleton + smoke test

**Files:**
- Modify: `esbuild.js`
- Create: `src/panel.ts`, `src/webview/main.ts` (skeleton — full render logic in Task 8), `src/webview/styles.css` (empty placeholder file so the bundle succeeds; full content in Task 8)
- Modify: `src/test/extension.test.ts`

**Interfaces:**
- Consumes: message types from Task 3.
- Produces: `AdvisorPanel.show(extensionUri: vscode.Uri, onMessage: (m: WebviewToExtension) => void): AdvisorPanel` and instance method `post(message: ExtensionToWebview): void`. Task 9 depends on both. Build outputs: `dist/extension.js`, `dist/webview.js`, `dist/styles.css`.

- [ ] **Step 1: Replace `esbuild.js` with the dual-bundle build**

```js
const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

const common = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	logLevel: 'silent',
	plugins: [esbuildProblemMatcherPlugin],
};

async function main() {
	const extensionCtx = await esbuild.context({
		...common,
		entryPoints: ['src/extension.ts'],
		format: 'cjs',
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
	});
	const webviewCtx = await esbuild.context({
		...common,
		entryPoints: { webview: 'src/webview/main.ts', styles: 'src/webview/styles.css' },
		format: 'iife',
		platform: 'browser',
		outdir: 'dist',
	});
	if (watch) {
		await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
	} else {
		await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
		await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
```

- [ ] **Step 2: Create `src/panel.ts`**

```ts
import * as vscode from 'vscode';
import type { ExtensionToWebview, WebviewToExtension } from './models/types';

export class AdvisorPanel {
	public static current: AdvisorPanel | undefined;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		onMessage: (m: WebviewToExtension) => void
	) {
		this.panel.webview.html = this.getHtml(this.panel.webview, extensionUri);
		this.panel.webview.onDidReceiveMessage((m: WebviewToExtension) => onMessage(m));
		this.panel.onDidDispose(() => {
			AdvisorPanel.current = undefined;
		});
	}

	static show(extensionUri: vscode.Uri, onMessage: (m: WebviewToExtension) => void): AdvisorPanel {
		if (AdvisorPanel.current) {
			AdvisorPanel.current.panel.reveal();
			return AdvisorPanel.current;
		}
		const panel = vscode.window.createWebviewPanel(
			'localModelAdvisor',
			'Local Model Advisor',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
			}
		);
		AdvisorPanel.current = new AdvisorPanel(panel, extensionUri, onMessage);
		return AdvisorPanel.current;
	}

	post(message: ExtensionToWebview): void {
		void this.panel.webview.postMessage(message);
	}

	private getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'styles.css'));
		const nonce = getNonce();
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${styleUri}">
	<title>Local Model Advisor</title>
</head>
<body>
	<div id="app"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
```

- [ ] **Step 3: Create skeleton `src/webview/main.ts`** (proves the message pipe; Task 8 replaces the body)

```ts
import type { ExtensionToWebview } from '../models/types';

const app = document.getElementById('app') as HTMLElement;
app.textContent = 'BOOTING…';

window.addEventListener('message', (event: MessageEvent<ExtensionToWebview>) => {
	app.textContent = `received: ${event.data.type}`;
});
```

- [ ] **Step 4: Create `src/webview/styles.css`** containing only the comment `/* neon design system — populated in Task 8 */` so the bundle has a real entry point.

- [ ] **Step 5: Verify the triple output**

Run: `npm run compile`
Expected: exits 0; `dist/extension.js`, `dist/webview.js`, `dist/styles.css` all exist.

- [ ] **Step 6: Replace `src/test/extension.test.ts` with a real smoke test**

```ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Local Model Advisor', () => {
	test('contributes both commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('local-model-advisor.scanHardware'));
		assert.ok(commands.includes('local-model-advisor.setHuggingFaceToken'));
	});
});
```

- [ ] **Step 7: Run the integration test**

Run: `npm test`
Expected: PASS (downloads a VS Code build on first run; needs a display — on a headless Linux CI use `xvfb-run`, on this Windows dev box it runs directly).

- [ ] **Step 8: Commit**

```bash
git add esbuild.js src/panel.ts src/webview/main.ts src/webview/styles.css src/test/extension.test.ts
git commit -m "feat: webview panel with strict CSP and dual esbuild bundle"
```

---

### Task 8: Neon UI — full webview frontend

**Files:**
- Modify: `src/webview/main.ts` (full replacement), `src/webview/styles.css` (full replacement)

**Interfaces:**
- Consumes: the full message protocol and `ScoredModel`/`HardwareInfo`/`FitTier` from Task 3. Posts `rescan` / `openExternal` / `copy` messages that Task 9 handles.
- Produces: nothing consumed by later tasks (leaf).

**Design contract (also captured in `.claude/skills/neon-webview-ui` — keep the two in sync):**
- Palette: void `#05060a`, panel `#0b0d14`, line `rgba(0,240,255,.22)`, neon cyan `#00f0ff` (primary / GPU tier), magenta `#ff2ec4` (accents / hybrid tier), amber `#ffb300` (CPU tier / warnings), body text `#c8d3e0`, bright text `#eaf6ff`.
- Effects: layered glow shadows, faint CRT scanlines overlay, background grid, corner-cut cards via `clip-path`. All local — **no external fonts or assets** (CSP forbids them); type is the editor's mono stack.
- Motion: radar-sweep loader (conic-gradient), staggered row entrance, button pulse — all disabled under `prefers-reduced-motion: reduce`.
- Security: model names/ids from the network are rendered with `textContent`, never `innerHTML`.

- [ ] **Step 1: Replace `src/webview/styles.css`**

```css
:root {
	--void: #05060a;
	--panel: #0b0d14;
	--panel-2: #10131d;
	--line: rgba(0, 240, 255, 0.22);
	--cyan: #00f0ff;
	--magenta: #ff2ec4;
	--amber: #ffb300;
	--text: #c8d3e0;
	--text-bright: #eaf6ff;
	--text-dim: #5c6a7d;
	--mono: var(--vscode-editor-font-family, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
	background:
		linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
		linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px),
		var(--void);
	background-size: 32px 32px, 32px 32px, auto;
	color: var(--text);
	font-family: var(--mono);
	font-size: 13px;
	min-height: 100vh;
	position: relative;
}

/* CRT scanlines */
body::after {
	content: '';
	position: fixed;
	inset: 0;
	pointer-events: none;
	background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.14) 0 1px, transparent 1px 3px);
	z-index: 10;
}

#app { max-width: 860px; margin: 0 auto; padding: 24px 20px 48px; }

/* ── Header ─────────────────────────────────────── */
.hud-header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	border-bottom: 1px solid var(--line);
	padding-bottom: 12px;
	margin-bottom: 20px;
}
.hud-title {
	color: var(--cyan);
	font-size: 18px;
	letter-spacing: 0.35em;
	text-transform: uppercase;
	text-shadow: 0 0 6px rgba(0, 240, 255, 0.8), 0 0 24px rgba(0, 240, 255, 0.35);
}
.hud-sub { color: var(--text-dim); letter-spacing: 0.15em; font-size: 11px; }

/* ── Hardware cards ─────────────────────────────── */
.hw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
.hw-card {
	background: linear-gradient(160deg, var(--panel-2), var(--panel));
	border: 1px solid var(--line);
	clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
	padding: 14px 16px;
}
.hw-label { color: var(--text-dim); font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 6px; }
.hw-value { color: var(--text-bright); font-size: 14px; line-height: 1.35; word-break: break-word; }
.hw-value .unit { color: var(--cyan); }

/* ── Filter chips ───────────────────────────────── */
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.chip {
	background: transparent;
	border: 1px solid var(--line);
	color: var(--text);
	font-family: inherit;
	font-size: 11px;
	letter-spacing: 0.15em;
	text-transform: uppercase;
	padding: 5px 14px;
	cursor: pointer;
	transition: all 0.15s ease;
}
.chip:hover { border-color: var(--cyan); color: var(--cyan); }
.chip.active {
	border-color: var(--cyan);
	color: var(--void);
	background: var(--cyan);
	box-shadow: 0 0 10px rgba(0, 240, 255, 0.7), 0 0 32px rgba(0, 240, 255, 0.3);
}

/* ── Model rows ─────────────────────────────────── */
.model-list { display: flex; flex-direction: column; gap: 10px; }
.model-row {
	display: grid;
	grid-template-columns: 34px 1fr auto;
	gap: 12px;
	align-items: center;
	background: linear-gradient(160deg, var(--panel-2), var(--panel));
	border: 1px solid var(--line);
	border-left: 3px solid var(--cyan);
	padding: 12px 14px;
	animation: row-in 0.3s ease both;
}
.model-row.tier-hybrid { border-left-color: var(--magenta); }
.model-row.tier-cpu { border-left-color: var(--amber); }
@keyframes row-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.rank { color: var(--text-dim); font-size: 15px; text-align: right; }
.model-name {
	background: none; border: none; padding: 0; cursor: pointer; text-align: left;
	color: var(--text-bright); font-family: inherit; font-size: 13.5px;
}
.model-name:hover { color: var(--cyan); text-shadow: 0 0 8px rgba(0, 240, 255, 0.6); }
.model-meta { color: var(--text-dim); font-size: 11px; margin-top: 4px; }
.model-meta b { color: var(--text); font-weight: normal; }

.row-actions { display: flex; align-items: center; gap: 10px; }
.badge {
	font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
	padding: 3px 9px; border: 1px solid currentColor;
}
.badge.tier-gpu { color: var(--cyan); text-shadow: 0 0 6px rgba(0, 240, 255, 0.7); }
.badge.tier-hybrid { color: var(--magenta); text-shadow: 0 0 6px rgba(255, 46, 196, 0.7); }
.badge.tier-cpu { color: var(--amber); text-shadow: 0 0 6px rgba(255, 179, 0, 0.7); }

.copy-btn {
	background: transparent; border: 1px solid var(--line); color: var(--cyan);
	font-family: inherit; font-size: 10.5px; letter-spacing: 0.1em;
	padding: 5px 10px; cursor: pointer; transition: all 0.15s ease;
}
.copy-btn:hover { background: rgba(0, 240, 255, 0.12); box-shadow: 0 0 12px rgba(0, 240, 255, 0.4); }

/* ── Scan / rescan button ───────────────────────── */
.scan-btn {
	display: block; margin: 26px auto 0;
	background: transparent; border: 1px solid var(--cyan); color: var(--cyan);
	font-family: inherit; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase;
	padding: 10px 34px; cursor: pointer;
	animation: pulse 2.4s ease-in-out infinite;
}
.scan-btn:hover { background: rgba(0, 240, 255, 0.12); }
@keyframes pulse {
	0%, 100% { box-shadow: 0 0 6px rgba(0, 240, 255, 0.4); }
	50% { box-shadow: 0 0 18px rgba(0, 240, 255, 0.8), 0 0 48px rgba(0, 240, 255, 0.25); }
}

/* ── Radar loader ───────────────────────────────── */
.radar-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 0; }
.radar {
	width: 110px; height: 110px; border-radius: 50%;
	border: 1px solid var(--line);
	background:
		radial-gradient(circle, transparent 55%, rgba(0, 240, 255, 0.06) 56%, transparent 57%),
		conic-gradient(from 0deg, rgba(0, 240, 255, 0.55), transparent 70deg);
	animation: sweep 1.6s linear infinite;
	box-shadow: 0 0 24px rgba(0, 240, 255, 0.25), inset 0 0 24px rgba(0, 240, 255, 0.12);
}
@keyframes sweep { to { transform: rotate(360deg); } }
.radar-label { color: var(--cyan); letter-spacing: 0.3em; font-size: 11px; text-transform: uppercase; animation: blink 1.2s step-end infinite; }
@keyframes blink { 50% { opacity: 0.35; } }

/* ── Banners ────────────────────────────────────── */
.banner {
	border: 1px dashed var(--amber); color: var(--amber);
	font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
	padding: 8px 12px; margin-bottom: 16px;
}
.error-box {
	border: 1px solid var(--magenta); color: var(--magenta);
	padding: 16px; text-shadow: 0 0 8px rgba(255, 46, 196, 0.5);
}
.footnote { color: var(--text-dim); font-size: 10.5px; margin-top: 22px; line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
	.model-row, .scan-btn, .radar, .radar-label { animation: none; }
}
```

- [ ] **Step 2: Replace `src/webview/main.ts` with the full frontend**

```ts
import type {
	CatalogSource, ExtensionToWebview, FitTier, HardwareInfo, ScoredModel, WebviewToExtension,
} from '../models/types';

declare function acquireVsCodeApi(): { postMessage(msg: WebviewToExtension): void };
const vscode = acquireVsCodeApi();

const app = document.getElementById('app') as HTMLElement;

let hardware: HardwareInfo | null = null;
let models: ScoredModel[] = [];
let source: CatalogSource = 'live';
let filter: FitTier | 'all' = 'all';

const TIER_LABEL: Record<FitTier, string> = { gpu: 'GPU TURBO', hybrid: 'HYBRID', cpu: 'CPU OK', none: '—' };

window.addEventListener('message', (event: MessageEvent<ExtensionToWebview>) => {
	const msg = event.data;
	switch (msg.type) {
		case 'scanning':
			renderLoading();
			break;
		case 'hardware':
			hardware = msg.hardware;
			renderLoading();
			break;
		case 'models':
			models = msg.models;
			source = msg.source;
			renderResults();
			break;
		case 'error':
			renderError(msg.message);
			break;
	}
});

function el<K extends keyof HTMLElementTagNameMap>(
	tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) { node.className = className; }
	if (text !== undefined) { node.textContent = text; }
	return node;
}

function header(): HTMLElement {
	const wrap = el('div', 'hud-header');
	wrap.append(el('div', 'hud-title', 'Local Model Advisor'), el('div', 'hud-sub', '// SYSTEM SCAN'));
	return wrap;
}

function hardwareGrid(hw: HardwareInfo): HTMLElement {
	const grid = el('div', 'hw-grid');
	const card = (label: string, value: string, unit?: string) => {
		const c = el('div', 'hw-card');
		c.append(el('div', 'hw-label', label));
		const v = el('div', 'hw-value', value);
		if (unit) {
			v.append(' ');
			v.append(el('span', 'unit', unit));
		}
		c.append(v);
		return c;
	};
	grid.append(
		card('CPU', hw.cpuModel, `· ${hw.physicalCores} cores`),
		card('RAM', String(hw.ramGB), 'GB'),
		card('GPU', hw.gpuModel ?? 'None detected', hw.vramGB > 0 ? `· ${hw.vramGB} GB VRAM` : undefined),
	);
	return grid;
}

function renderLoading(): void {
	app.replaceChildren(header());
	if (hardware) { app.append(hardwareGrid(hardware)); }
	const wrap = el('div', 'radar-wrap');
	wrap.append(el('div', 'radar'), el('div', 'radar-label', hardware ? 'Querying model index' : 'Scanning hardware'));
	app.append(wrap);
}

function renderError(message: string): void {
	app.replaceChildren(header());
	if (hardware) { app.append(hardwareGrid(hardware)); }
	app.append(el('div', 'error-box', `SIGNAL LOST — ${message}`));
	app.append(rescanButton());
}

function renderResults(): void {
	app.replaceChildren(header());
	if (hardware) { app.append(hardwareGrid(hardware)); }

	if (source === 'fallback') {
		app.append(el('div', 'banner', 'Offline mode — showing bundled catalog (Hugging Face unreachable)'));
	}

	const chips = el('div', 'chips');
	const options: (FitTier | 'all')[] = ['all', 'gpu', 'hybrid', 'cpu'];
	for (const opt of options) {
		const chip = el('button', `chip${filter === opt ? ' active' : ''}`, opt === 'all' ? 'All' : TIER_LABEL[opt]);
		chip.addEventListener('click', () => { filter = opt; renderResults(); });
		chips.append(chip);
	}
	app.append(chips);

	const visible = models.filter((m) => filter === 'all' || m.tier === filter);
	const list = el('div', 'model-list');
	visible.forEach((m, i) => {
		const row = el('div', `model-row tier-${m.tier}`);
		row.style.animationDelay = `${i * 45}ms`;

		row.append(el('div', 'rank', String(i + 1).padStart(2, '0')));

		const mid = el('div');
		const name = el('button', 'model-name', m.name);
		name.title = `Open ${m.modelId} on Hugging Face`;
		name.addEventListener('click', () => vscode.postMessage({ type: 'openExternal', url: m.hfUrl }));
		mid.append(name);
		mid.append(el('div', 'model-meta',
			`${m.paramsB}B params · ~${m.estimatedSizeGB} GB @ Q4 · needs ${m.minRamGB} GB · ${m.downloads.toLocaleString()} downloads`));
		row.append(mid);

		const actions = el('div', 'row-actions');
		actions.append(el('span', `badge tier-${m.tier}`, TIER_LABEL[m.tier]));
		const copy = el('button', 'copy-btn', '⧉ ollama run');
		copy.title = `Copy: ollama run hf.co/${m.modelId}`;
		copy.addEventListener('click', () => vscode.postMessage({ type: 'copy', text: `ollama run hf.co/${m.modelId}` }));
		actions.append(copy);
		row.append(actions);

		list.append(row);
	});
	if (visible.length === 0) {
		list.append(el('div', 'banner', 'No models in this tier for your hardware'));
	}
	app.append(list);

	app.append(el('div', 'footnote',
		'Sizes assume Q4 quantization (~0.6 GB per billion params). GPU TURBO = fully fits in VRAM. ' +
		'HYBRID = partial GPU offload. CPU OK = fits in system RAM. Detected VRAM can be inaccurate on some Windows drivers.'));
	app.append(rescanButton());
}

function rescanButton(): HTMLElement {
	const btn = el('button', 'scan-btn', 'Rescan');
	btn.addEventListener('click', () => vscode.postMessage({ type: 'rescan' }));
	return btn;
}

renderLoading();
```

- [ ] **Step 3: Verify build + all unit tests**

Run: `npm run compile && npm run test:unit`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/webview/main.ts src/webview/styles.css
git commit -m "feat: neon terminal webview UI with fit badges, filters and ollama copy"
```

---

### Task 9: Wire the extension end-to-end (retire the OutputChannel)

**Files:**
- Modify: `src/extension.ts` (full replacement)
- Delete: `src/fetchModels.ts`

**Interfaces:**
- Consumes: `AdvisorPanel` (Task 7), `scanHardware` (Task 5), `getRecommendations` (Task 4), `getHfToken`/`promptAndStoreHfToken` (Task 6).

- [ ] **Step 1: Replace `src/extension.ts`**

```ts
import * as vscode from 'vscode';
import { scanHardware } from './hardware';
import { getRecommendations } from './models/fetch';
import { AdvisorPanel } from './panel';
import { getHfToken, promptAndStoreHfToken } from './secrets';
import type { WebviewToExtension } from './models/types';

export function activate(context: vscode.ExtensionContext) {
	const scanCommand = vscode.commands.registerCommand('local-model-advisor.scanHardware', () => {
		const panel = AdvisorPanel.show(context.extensionUri, (m) => handleWebviewMessage(context, m));
		void runScan(context, panel);
	});

	const tokenCommand = vscode.commands.registerCommand('local-model-advisor.setHuggingFaceToken', () =>
		promptAndStoreHfToken(context)
	);

	context.subscriptions.push(scanCommand, tokenCommand);
}

function handleWebviewMessage(context: vscode.ExtensionContext, message: WebviewToExtension): void {
	switch (message.type) {
		case 'rescan':
			if (AdvisorPanel.current) {
				void runScan(context, AdvisorPanel.current);
			}
			break;
		case 'openExternal':
			void vscode.env.openExternal(vscode.Uri.parse(message.url));
			break;
		case 'copy':
			void vscode.env.clipboard.writeText(message.text).then(() =>
				vscode.window.showInformationMessage('Command copied — paste it in your terminal.')
			);
			break;
	}
}

async function runScan(context: vscode.ExtensionContext, panel: AdvisorPanel): Promise<void> {
	panel.post({ type: 'scanning' });
	try {
		const hardware = await scanHardware();
		panel.post({ type: 'hardware', hardware });
		const token = await getHfToken(context);
		const { models, source } = await getRecommendations(hardware, { token });
		panel.post({ type: 'models', models, source });
	} catch (err) {
		panel.post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
	}
}

export function deactivate() {}
```

- [ ] **Step 2: Delete the superseded module**

```bash
git rm src/fetchModels.ts
```

- [ ] **Step 3: Full verification**

Run: `npm run compile && npm run test:unit && npm test`
Expected: all pass.

- [ ] **Step 4: Manual verification (required)**

Press F5 in VS Code → in the Extension Development Host run `Local Model Advisor: Scan Hardware & Recommend Models`. Expected: radar loader → hardware cards → ranked neon model rows; clicking a name opens the HF page; the copy button toasts; Rescan re-runs; disconnect the network and Rescan to see the amber OFFLINE MODE banner.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire webview end-to-end, retire OutputChannel prototype"
```

---

### Task 10: Marketplace assets & docs

**Files:**
- Create: `media/icon.svg`, `scripts/render-icon.mjs`, `LICENSE`
- Modify: `README.md`, `CHANGELOG.md`, `.vscodeignore`, `CLAUDE.md`, `package.json` (version → `0.1.0`)

- [ ] **Step 1: Create `media/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
	<defs>
		<filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
			<feGaussianBlur stdDeviation="6" result="b"/>
			<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
		</filter>
	</defs>
	<rect width="256" height="256" rx="40" fill="#05060a"/>
	<g filter="url(#glow)" fill="none" stroke="#00f0ff" stroke-width="7" stroke-linecap="round">
		<rect x="78" y="78" width="100" height="100" rx="14"/>
		<path d="M104 78V52M128 78V52M152 78V52M104 178v26M128 178v26M152 178v26M78 104H52M78 128H52M78 152H52M178 104h26M178 128h26M178 152h26"/>
	</g>
	<g filter="url(#glow)">
		<circle cx="128" cy="128" r="26" fill="none" stroke="#ff2ec4" stroke-width="6"/>
		<circle cx="128" cy="128" r="7" fill="#ff2ec4"/>
	</g>
</svg>
```

- [ ] **Step 2: Create `scripts/render-icon.mjs` and render the PNG** (marketplace requires PNG icons; SVG is rejected)

```js
import sharp from 'sharp';

await sharp('media/icon.svg', { density: 300 })
	.resize(256, 256)
	.png()
	.toFile('media/icon.png');
console.log('media/icon.png written');
```

Run: `npm install -D sharp && node scripts/render-icon.mjs`
Expected: `media/icon.png` exists (256×256).

- [ ] **Step 3: Create `LICENSE`** — standard MIT text, copyright line: `Copyright (c) 2026 Vihaan Raut` (adjust the name if you prefer your legal name differs).

- [ ] **Step 4: Rewrite `README.md`**

```markdown
# Local Model Advisor

Find local AI models that **actually fit your machine** — from inside VS Code.

One command scans your CPU, RAM and GPU, cross-references the most-downloaded
GGUF models on Hugging Face, and ranks what your hardware can really run:

- **GPU TURBO** — fits entirely in VRAM (fastest)
- **HYBRID** — partial GPU offload
- **CPU OK** — fits in system RAM

Each recommendation ships with a one-click `ollama run hf.co/<model>` command.

![screenshot](media/screenshot.png)

## Usage

1. `Ctrl+Shift+P` → **Local Model Advisor: Scan Hardware & Recommend Models**
2. Filter by tier, open the model's Hugging Face page, or copy its Ollama command.

## Optional: Hugging Face token

The advisor works without any account. If you hit API rate limits, add a free
`read` token from <https://huggingface.co/settings/tokens> via
**Local Model Advisor: Set Hugging Face Token** — it is stored in your OS
keychain (VS Code SecretStorage), never in settings or on disk in plain text.

## Privacy

Hardware details never leave your machine. The only network call is a public
model-listing request to `huggingface.co`; when offline, a bundled catalog is
used instead.

## How sizes are estimated

Sizes assume Q4 quantization (~0.6 GB per billion parameters) plus context
headroom. Reported VRAM can be inaccurate on some Windows drivers — treat
tiers as guidance, not gospel.
```

Then capture a real screenshot of the panel (F5 → run the command → screenshot) and save it as `media/screenshot.png`. The README references it; the marketplace page looks bare without one.

- [ ] **Step 5: Rewrite `CHANGELOG.md`**

```markdown
# Change Log

## 0.1.0 — Initial release

- Hardware scan (CPU, RAM, GPU/VRAM) via systeminformation
- Live Hugging Face GGUF catalog with bundled offline fallback
- VRAM/RAM-aware fit tiers (GPU TURBO / HYBRID / CPU OK) and ranking
- Neon terminal webview UI with tier filters
- One-click `ollama run` command copy
- Optional Hugging Face token via SecretStorage
```

- [ ] **Step 6: Update `.vscodeignore`** — read the existing file and ensure it excludes `src/**`, `out/**`, `node_modules/**`, `scripts/**`, `media/icon.svg`, `.vscode-test.mjs`, `vitest.config.ts`, `code_design.md`, `.claude/**` but **keeps** `dist/**`, `media/icon.png`, `media/screenshot.png`, `README.md`, `CHANGELOG.md`, `LICENSE`.

- [ ] **Step 7: Refresh `CLAUDE.md`** — remove the stale "Known Issue" section (fixed long ago), replace "Planned Architecture" with the shipped architecture (webview + `src/models/` layout + fallback catalog), add `npm run test:unit`, and note the three project skills in `.claude/skills/`.

- [ ] **Step 8: Bump version** — in `package.json` set `"version": "0.1.0"`.

- [ ] **Step 9: Verify the package builds cleanly**

Run: `npx vsce package`
Expected: `local-model-advisor-0.1.0.vsix` produced with no errors (warnings about a missing repository URL mean the GitHub repo doesn't exist yet — create it or adjust the URL). Then sanity-install it: `code --install-extension local-model-advisor-0.1.0.vsix` and run the command once.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "docs: marketplace assets, README, changelog, license; v0.1.0"
```

---

### Task 11: CI + publish workflow — ✅ WORKFLOWS DONE / ⏸️ Step 3 needs external accounts

> Steps 1, 2 and 4 landed in fix wave 2. Both workflow files exist and are committed. Only Step 3 (create the Marketplace publisher + Azure DevOps PAT) remains, and it is account creation, not code.
>
> **Deviations from the YAML below, made deliberately:**
>
> 1. `publish.yml` passes the PAT as the `VSCE_PAT` **env var** rather than `-p ${{ secrets.VSCE_PAT }}` on the command line — vsce reads it natively, and argv can surface in process listings and error output.
> 2. `publish.yml` runs `lint` / `check-types` / `test:unit` before publishing. The version below publishes an entirely unverified build.
> 3. Both workflows declare `permissions: contents: read` and use expanded (non-flow) YAML.
> 4. `.github/**` was added to `.vscodeignore` so the workflows do not ship inside the `.vsix`.

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

- [x] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main, master] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run check-types
      - run: npm run test:unit
      - run: npx vsce package
      - uses: actions/upload-artifact@v4
        with: { name: vsix, path: '*.vsix' }
```

- [x] **Step 2: Create `.github/workflows/publish.yml`** (manual trigger; reads the `VSCE_PAT` repo secret — see Part B)

```yaml
name: Publish
on: workflow_dispatch
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```

- [ ] **Step 3: First-publish runbook (manual, one-time — also in `.claude/skills/marketplace-release`)** ⬅️ **THE ONLY REMAINING STEP**

1. ✅ Already done — the GitHub repo `VihaanR/local-model-advisor` exists and `master` is pushed.
2. Create a publisher at https://marketplace.visualstudio.com/manage — the ID you choose **must match `publisher` in `package.json`** (plan default: `vihaan-raut`).
3. Create the Azure DevOps PAT (Part B) and either `npx vsce login vihaan-raut` + `npx vsce publish` locally, or add it as the `VSCE_PAT` GitHub secret and run the Publish workflow.

- [x] **Step 4: Commit** — landed in fix wave 2.

```bash
git add .github
git commit -m "ci: build/test/package workflow and manual publish workflow"
```

---

### Task 12: Second live catalog source — GPT4All — 📋 PLANNED (not started)

> Not blocked on anything external. Independent of Task 11 — do in either order. Grew out of a user request to broaden the live model pool beyond Hugging Face alone. Two other candidates were investigated and rejected: Ollama's library has no official public API (only an unofficial third party at `ollamadb.dev`, which could not even be reached from the research environment to verify — not building on an unverifiable dependency); ModelScope has no documented public REST listing endpoint. GPT4All's catalog (`https://gpt4all.io/models/models3.json`) is real, public, no-auth, and was fetched and inspected directly during planning — every field/URL shape referenced below is from the actual live file, not assumed.

**Design decisions locked in during planning (do not relitigate mid-implementation):**
1. GPT4All catalog rows whose `url` is not a `huggingface.co/{owner}/{repo}/resolve/...` link are **skipped entirely** — confirmed against real data that some entries self-host on `gpt4all.io` (e.g. `Llama 3 8B Instruct` → `https://gpt4all.io/models/gguf/Meta-Llama-3-8B-Instruct.Q4_0.gguf`). The product's "Open on Hugging Face" button and `ollama run hf.co/{modelId}` copy command both require a real HF repo path; there is no fallback action for a non-HF file.
2. `estimatedSizeGB` for GPT4All entries uses the catalog's own real `filesize` (bytes → GiB), not the `paramsB × Q4_GB_PER_B` estimate used for HF — this is more accurate since it's an actual measured file, not a guess.
3. `minRamGB` for GPT4All entries is still computed with the project's own formula (`ceil((size + CPU_OVERHEAD_GB) / (1 - OS_RESERVE_FRACTION))`), **not** GPT4All's own `ramrequired` field, even though that field exists. Reason: mixing two different RAM-requirement methodologies across sources would silently reintroduce the exact inconsistency Part D's I3 fix just eliminated.
4. GPT4All entries get `downloads: 0, likes: 0` (the catalog has no popularity data) — deliberately not faked. Per the existing scoring rule ("tier always dominates popularity"), this means a GPT4All entry only displaces an HF entry within the same tier when there's room left after more-downloaded HF entries. This is accepted as correct, honest behavior, not something to patch around.
5. `getRecommendations`'s public signature and return shape are **unchanged** — `extension.ts`, `panel.ts`, and the webview need zero modifications. Merge/dedup happens entirely inside `src/models/`.

**Files:**
- Modify: `src/models/constants.ts` (add `TIMEOUT_MS`)
- Create: `src/models/errors.ts` (extract `HttpError` + `classifyFetchError` out of `fetch.ts`)
- Create: `src/models/dedupe.ts` + `src/models/dedupe.test.ts` (extract the name-based de-dup reducer out of `fetch.ts`)
- Create: `src/models/gpt4all.ts` + `src/models/gpt4all.test.ts`
- Modify: `src/models/fetch.ts` (use the extracted modules; `getRecommendations` becomes multi-source) + `src/models/fetch.test.ts` (new `getRecommendations` cases)
- Modify: `.claude/skills/model-recommendation-logic/SKILL.md` (Data source policy section)

**Interfaces:**
- Consumes: `ModelRecommendation`, `HardwareInfo`, `CatalogSource`, `FetchFailureReason` from `./types`.
- Produces: `fetchGpt4AllModels(opts?: { signal?: AbortSignal }): Promise<ModelRecommendation[]>` (`gpt4all.ts`); `dedupeByName(models: ModelRecommendation[]): ModelRecommendation[]` (`dedupe.ts`); `HttpError`, `classifyFetchError(err: unknown): FetchFailureReason` (`errors.ts`, re-exported from `fetch.ts` so existing `fetch.test.ts` imports of `HttpError`/`classifyFetchError` from `./fetch` keep working unchanged).

- [ ] **Step 1: Add `TIMEOUT_MS` to `constants.ts`**

```typescript
export const CTX_HEADROOM_GB = 0.8;      // KV-cache/context room on top of weights
export const CPU_OVERHEAD_GB = 2;        // runtime + context when running on CPU
export const OS_RESERVE_FRACTION = 0.25; // leave a quarter of RAM to the OS
export const Q4_GB_PER_B = 0.6;          // Q4 quantization: ~0.6 GB per billion params
export const TIMEOUT_MS = 10_000;        // network timeout for any live catalog source
```

- [ ] **Step 2: Extract `src/models/errors.ts`** (moves `HttpError`/`classifyFetchError` out of `fetch.ts` so `gpt4all.ts` can use them without a circular import)

```typescript
import type { FetchFailureReason } from './types';

export class HttpError extends Error {
	constructor(public readonly status: number, message = `Request failed with status ${status}`) {
		super(message);
	}
}

export function classifyFetchError(err: unknown): FetchFailureReason {
	if (err instanceof HttpError) {
		if (err.status === 401 || err.status === 403) { return 'auth'; }
		if (err.status === 429) { return 'rate-limit'; }
		if (err.status >= 500) { return 'server'; }
		return 'unknown';
	}
	if (err instanceof DOMException && err.name === 'AbortError') { return 'network'; }
	if (err instanceof TypeError) { return 'network'; }
	return 'unknown';
}
```

In `fetch.ts`: delete the local `HttpError`/`classifyFetchError` definitions, add `import { HttpError, classifyFetchError } from './errors';` and `export { HttpError, classifyFetchError };` right after the imports. Change the throw site to `throw new HttpError(res.status, \`Hugging Face API returned ${res.status}\`);` (same text as before, now via the shared constructor's optional message param). Run `npx vitest run src/models/fetch.test.ts` — all existing tests (including the `classifyFetchError` describe block) must still pass unchanged, since the import path `from './fetch'` still resolves via the re-export.

- [ ] **Step 3: Write `src/models/dedupe.test.ts` (failing first)**

```typescript
import { describe, it, expect } from 'vitest';
import { dedupeByName } from './dedupe';
import type { ModelRecommendation } from './types';

const rec = (name: string, downloads: number): ModelRecommendation => ({
	name, modelId: `pub/${name}`, paramsB: 7, estimatedSizeGB: 4.2, minRamGB: 9, downloads, likes: 0,
	hfUrl: `https://huggingface.co/pub/${name}`,
});

describe('dedupeByName', () => {
	it('keeps the highest-download variant among same-name entries', () => {
		const out = dedupeByName([rec('Llama-3.1-8B-Instruct-GGUF', 100), rec('Llama-3.1-8B-Instruct-GGUF', 5000)]);
		expect(out).toHaveLength(1);
		expect(out[0].downloads).toBe(5000);
	});
	it('is case/suffix/punctuation insensitive when matching names', () => {
		const out = dedupeByName([rec('Foo-Bar-GGUF', 10), rec('foo bar', 20)]);
		expect(out).toHaveLength(1);
		expect(out[0].downloads).toBe(20);
	});
	it('keeps distinct models separate', () => {
		const out = dedupeByName([rec('Alpha', 10), rec('Beta', 20)]);
		expect(out).toHaveLength(2);
	});
});
```

Run: `npx vitest run src/models/dedupe.test.ts` — expect FAIL (`dedupe.ts` doesn't exist yet).

- [ ] **Step 4: Implement `src/models/dedupe.ts`**

```typescript
import type { ModelRecommendation } from './types';

function normalizeBaseName(name: string): string {
	return name.toLowerCase().replace(/-gguf$/i, '').replace(/[^a-z0-9]+/g, '');
}

/** Collapses re-packaged/duplicate listings of the same underlying model, keeping the highest-download variant. */
export function dedupeByName(models: ModelRecommendation[]): ModelRecommendation[] {
	const bestByName = new Map<string, ModelRecommendation>();
	for (const rec of models) {
		const key = normalizeBaseName(rec.name);
		const existing = bestByName.get(key);
		if (!existing || rec.downloads > existing.downloads) {
			bestByName.set(key, rec);
		}
	}
	return Array.from(bestByName.values());
}
```

Run: `npx vitest run src/models/dedupe.test.ts` — expect PASS (3/3).

- [ ] **Step 5: Refactor `fetch.ts` to use `dedupe.ts` and `constants.ts`'s `TIMEOUT_MS`**

Replace the inline `normalizeBaseName`/de-dup block at the end of `fetchLiveModels` with `return dedupeByName(out);` (import `dedupeByName` from `./dedupe`), delete the now-unused local `normalizeBaseName` function, replace the local `const TIMEOUT_MS = 10_000;` with an import from `./constants`, and replace the local `const CPU_OVERHEAD_GB = 2;` with imports of `CPU_OVERHEAD_GB, OS_RESERVE_FRACTION` from `./constants` (this was already the state after the Part D fix wave for `minRamGB`'s formula — just confirm the import list is `{ CPU_OVERHEAD_GB, OS_RESERVE_FRACTION, TIMEOUT_MS }` afterward). Run `npx vitest run src/models/fetch.test.ts` — all tests, including `'de-duplicates re-packaged models...'`, must still pass with zero test-file changes (behavior is identical, only the implementation moved).

- [ ] **Step 6: Write `src/models/gpt4all.test.ts` (failing first)**

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchGpt4AllModels } from './gpt4all';

afterEach(() => vi.unstubAllGlobals());

describe('fetchGpt4AllModels', () => {
	it('maps a Hugging-Face-hosted entry, using real filesize for estimatedSizeGB', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [{
				name: 'Reasoner v1',
				url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_0.gguf',
				filesize: '4431390720',
				parameters: '8 billion',
			}],
		});
		vi.stubGlobal('fetch', fetchMock);
		const out = await fetchGpt4AllModels();
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			name: 'Reasoner v1',
			modelId: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
			paramsB: 8,
			estimatedSizeGB: 4.1,
			hfUrl: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
		});
	});
	it('parses decimal and million-scale parameter counts', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [
				{ name: 'Small', url: 'https://huggingface.co/a/Small-GGUF/resolve/main/s.gguf', filesize: '700000000', parameters: '770 million' },
				{ name: 'Mid', url: 'https://huggingface.co/a/Mid-GGUF/resolve/main/m.gguf', filesize: '1068807776', parameters: '1.5 billion' },
			],
		});
		vi.stubGlobal('fetch', fetchMock);
		const out = await fetchGpt4AllModels();
		expect(out.find((m) => m.name === 'Small')?.paramsB).toBeCloseTo(0.77);
		expect(out.find((m) => m.name === 'Mid')?.paramsB).toBe(1.5);
	});
	it('skips entries not hosted on huggingface.co (no valid ollama command possible)', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [{ name: 'Llama 3 8B Instruct', url: 'https://gpt4all.io/models/gguf/Meta-Llama-3-8B-Instruct.Q4_0.gguf', filesize: '4661724384', parameters: '8 billion' }],
		});
		vi.stubGlobal('fetch', fetchMock);
		expect(await fetchGpt4AllModels()).toHaveLength(0);
	});
	it('skips entries with unparseable parameters or missing filesize', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [
				{ name: 'NoParams', url: 'https://huggingface.co/a/NoParams-GGUF/resolve/main/n.gguf', filesize: '4000000000' },
				{ name: 'NoSize', url: 'https://huggingface.co/a/NoSize-GGUF/resolve/main/n.gguf', parameters: '7 billion' },
			],
		});
		vi.stubGlobal('fetch', fetchMock);
		expect(await fetchGpt4AllModels()).toHaveLength(0);
	});
	it('throws an HttpError on a non-OK response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
		await expect(fetchGpt4AllModels()).rejects.toThrow('503');
	});
});
```

Run: `npx vitest run src/models/gpt4all.test.ts` — expect FAIL (`gpt4all.ts` doesn't exist yet).

- [ ] **Step 7: Implement `src/models/gpt4all.ts`**

```typescript
import { CPU_OVERHEAD_GB, OS_RESERVE_FRACTION, TIMEOUT_MS } from './constants';
import { HttpError } from './errors';
import type { ModelRecommendation } from './types';

const GPT4ALL_ENDPOINT = 'https://gpt4all.io/models/models3.json';
const HF_RESOLVE_PATTERN = /^https:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\//i;
const PARAMS_PATTERN = /^([\d.]+)\s*(billion|million)\b/i;

interface Gpt4AllRow {
	name?: string;
	url?: string;
	filesize?: string;
	parameters?: string;
}

function parseParamsB(raw: string | undefined): number | null {
	if (!raw) { return null; }
	const m = raw.match(PARAMS_PATTERN);
	if (!m) { return null; }
	const n = parseFloat(m[1]);
	return m[2].toLowerCase() === 'million' ? n / 1000 : n;
}

export async function fetchGpt4AllModels(
	opts: { signal?: AbortSignal } = {}
): Promise<ModelRecommendation[]> {
	const res = await fetch(GPT4ALL_ENDPOINT, {
		signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok) {
		throw new HttpError(res.status, `GPT4All catalog returned ${res.status}`);
	}
	const rows = (await res.json()) as Gpt4AllRow[];
	const out: ModelRecommendation[] = [];
	for (const row of rows) {
		const urlMatch = row.url?.match(HF_RESOLVE_PATTERN);
		if (!urlMatch) {
			continue; // not Hugging-Face-hosted — no valid "ollama run hf.co/..." command is possible
		}
		const modelId = urlMatch[1];
		const paramsB = parseParamsB(row.parameters);
		const filesizeBytes = row.filesize ? Number(row.filesize) : NaN;
		if (paramsB === null || !Number.isFinite(filesizeBytes) || filesizeBytes <= 0) {
			continue;
		}
		const estimatedSizeGB = Math.round((filesizeBytes / 1024 ** 3) * 10) / 10;
		out.push({
			name: row.name ?? modelId.split('/').pop() ?? modelId,
			modelId,
			paramsB,
			estimatedSizeGB,
			minRamGB: Math.ceil((estimatedSizeGB + CPU_OVERHEAD_GB) / (1 - OS_RESERVE_FRACTION)),
			downloads: 0,
			likes: 0,
			hfUrl: `https://huggingface.co/${modelId}`,
		});
	}
	return out;
}
```

Run: `npx vitest run src/models/gpt4all.test.ts` — expect PASS (5/5).

- [ ] **Step 8: Rewrite `getRecommendations` in `fetch.ts` for multi-source merge**

```typescript
export async function getRecommendations(
	hw: HardwareInfo,
	opts: { token?: string } = {}
): Promise<{ models: ScoredModel[]; source: CatalogSource; reason?: FetchFailureReason }> {
	const [hfResult, gpt4AllResult] = await Promise.allSettled([
		fetchLiveModels(opts),
		fetchGpt4AllModels(),
	]);

	const live: ModelRecommendation[] = [
		...(hfResult.status === 'fulfilled' ? hfResult.value : []),
		...(gpt4AllResult.status === 'fulfilled' ? gpt4AllResult.value : []),
	];

	if (live.length > 0) {
		return { models: scoreModels(dedupeByName(live), hw), source: 'live' };
	}

	const primaryError = hfResult.status === 'rejected' ? hfResult.reason
		: gpt4AllResult.status === 'rejected' ? gpt4AllResult.reason
		: undefined;
	return { models: scoreModels(loadFallbackCatalog(), hw), source: 'fallback', reason: classifyFetchError(primaryError) };
}
```

Add `import { fetchGpt4AllModels } from './gpt4all';` to `fetch.ts`. Note `scoreModels(...)` here still sits outside any try/catch — `Promise.allSettled` never throws for individual source failures, and a genuine `scoreModels` bug still propagates as a real error rather than being reported as "offline," preserving Part D's I4 fix.

Add to `fetch.test.ts`'s `describe('getRecommendations', ...)` block (the existing `'falls back to the bundled catalog when the network fails'` test needs NO change — its single fetch mock rejects unconditionally, which now correctly fails both sources and still exercises the fallback path):

```typescript
it('merges Hugging Face and GPT4All results into one live pool', async () => {
	const fetchMock = vi.fn(async (url: string) => {
		if (url.includes('gpt4all.io')) {
			return { ok: true, json: async () => [{
				name: 'Foo Model',
				url: 'https://huggingface.co/someone/Foo-Model-GGUF/resolve/main/foo.Q4_0.gguf',
				filesize: '4000000000',
				parameters: '7 billion',
			}] };
		}
		return { ok: true, json: async () => [{ modelId: 'bartowski/Bar-Model-8B-GGUF', downloads: 50, likes: 1 }] };
	});
	vi.stubGlobal('fetch', fetchMock);
	const { models, source } = await getRecommendations(hw);
	expect(source).toBe('live');
	const names = models.map((m) => m.name);
	expect(names).toContain('Foo Model');
	expect(names.some((n) => n.includes('Bar-Model'))).toBe(true);
});

it('still returns a live pool from whichever source succeeds if the other fails', async () => {
	const fetchMock = vi.fn(async (url: string) => {
		if (url.includes('gpt4all.io')) { throw new Error('gpt4all down'); }
		return { ok: true, json: async () => [{ modelId: 'bartowski/Bar-Model-8B-GGUF', downloads: 50, likes: 1 }] };
	});
	vi.stubGlobal('fetch', fetchMock);
	const { models, source } = await getRecommendations(hw);
	expect(source).toBe('live');
	expect(models.length).toBeGreaterThan(0);
});
```

Run: `npx vitest run src/models/fetch.test.ts` — expect PASS, all tests (existing + 2 new).

- [ ] **Step 9: Update `.claude/skills/model-recommendation-logic/SKILL.md`'s "Data source policy" section**

Replace the existing three-bullet section with one documenting both sources, the merge/dedup behavior, the `minRamGB`-formula-always-wins rule, and the deliberate `downloads: 0` choice for GPT4All (content: the five numbered design decisions at the top of this task, condensed into skill-doc form).

- [ ] **Step 10: Full verification + commit**

```bash
npm run check-types && npm run lint && npm run test:unit && npm run compile && npm test
```

Expect: all clean, `test:unit` file count now 7 (`estimate`, `score`, `fetch`, `hardware`, `state`, `dedupe`, `gpt4all`).

```bash
git add src/models/constants.ts src/models/errors.ts src/models/dedupe.ts src/models/dedupe.test.ts \
        src/models/gpt4all.ts src/models/gpt4all.test.ts src/models/fetch.ts src/models/fetch.test.ts \
        .claude/skills/model-recommendation-logic/SKILL.md
git commit -m "feat: add GPT4All as a second live catalog source, merged and de-duped with Hugging Face"
```

---

### Task 13: Sidebar view, paginated results, and sorting — 📋 PLANNED (not started)

> Not blocked on anything external. Grew out of a user request with three parts: move the UI off the editor tab into the **sidebar** (with the scan button in it), stop capping results at 12, and add **sorting**. This is a **0.2.0 minor release** — it removes a user-visible surface (the editor tab) and changes the primary entry point.

**Why:** the advisor is a reference panel you consult while working, so an editor tab is the wrong home for it. `MAX_RESULTS = 12` is an arbitrary slice of a pool that is realistically 60–150 models after filtering, with no way to see the rest and no way to reorder them.

#### The one non-obvious finding — read before writing `taxonomy.ts`

"Sort by company of origin" **cannot be read off the model id.** The Hugging Face owner is usually a *repackager*, not the creator — verified against the real `catalog.json`:

- `bartowski/gemma-2-9b-it-GGUF` → Google's Gemma, not "bartowski"
- `TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF` → Mistral AI
- `bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF` → DeepSeek

Company and family must be derived from the model **name** via a curated pattern table, never from the owner segment.

#### Decisions locked in with the user during planning (do not relitigate mid-implementation)

| Decision | Choice |
|---|---|
| Scan trigger | View opens **idle**; nothing runs until SCAN is clicked. Re-opening replays the last results rather than re-scanning. |
| Result volume | **All** fitting models, **25 per page**, Google-style **numbered pager** (`‹ 1 2 3 … 7 ›`) at the bottom — not a "Show more" button. |
| Editor tab | **Removed entirely.** `src/panel.ts` is deleted; the scan command focuses the sidebar view. |
| Sort options | Recommended (default), Params ↓, Params ↑, Most downloaded, Size ↑, Name A–Z, Source site, Company of origin, Model family |

**Files:**
- Create: `src/models/taxonomy.ts` + `.test.ts`, `src/models/sort.ts` + `.test.ts`, `src/webview/paginate.ts` + `.test.ts`, `src/view.ts`, `media/sidebar-icon.svg`
- Delete: `src/panel.ts`
- Modify: `src/models/types.ts`, `constants.ts`, `score.ts`, `fetch.ts`, `gpt4all.ts`, `src/extension.ts`, `src/webview/{main,state,styles.css,bundle.test.ts}`, `package.json`, `tsconfig.webview.json`, `README.md`, `CHANGELOG.md`, `.claude/skills/model-recommendation-logic/SKILL.md`

**Interfaces:**
- Produces: `classifyModel(name: string): { family: string; company: string }` (`taxonomy.ts`); `sortModels(models: ScoredModel[], key: SortKey): ScoredModel[]` (`sort.ts`); `pageItems<T>(items, page, size): T[]` and `pageNumbers(current, total, window?): (number | '…')[]` (`paginate.ts`); `AdvisorViewProvider implements vscode.WebviewViewProvider` (`view.ts`).
- Consumes: everything already in `src/models/types.ts`.

- [ ] **Step 1: Data model — `provider`, `family`, `company`**

```ts
// src/models/types.ts
export type ModelProvider = 'huggingface' | 'gpt4all';

export interface ModelRecommendation {
	/* …existing fields… */
	provider: ModelProvider;      // which catalog it came from
}

export interface ScoredModel extends ModelRecommendation {
	tier: FitTier;
	score: number;
	family: string;               // 'Llama' | 'Qwen' | 'GLM' | 'Kimi' | … | 'Other'
	company: string;              // 'Meta' | 'Alibaba' | 'Google' | … | 'Unknown'
}
```

`provider` is a fact about the source, so the **fetcher** sets it. `family`/`company` are *derived* presentation metadata, so they are attached during **scoring** — this deliberately keeps `catalog.json` and the `isModelRecommendation` guard untouched.

Protocol changes in the same file: rename `WebviewToExtension` `{ type: 'rescan' }` → `{ type: 'scan' }` (the button reads "SCAN" before the first run), and add `{ type: 'ready' }`. `ExtensionToWebview` is unchanged.

- [ ] **Step 2: `src/models/taxonomy.ts` (TDD)**

An **ordered** array of `{ pattern: RegExp, family, company }` matched against the model **name**. Seed from the families actually present in the live pool and `catalog.json`:

| Pattern | Family | Company |
|---|---|---|
| `llama`, `tinyllama` | Llama | Meta |
| `qwen`, `qwq` | Qwen | Alibaba |
| `gemma` | Gemma | Google |
| `mistral`, `mixtral`, `magistral` | Mistral | Mistral AI |
| `phi` | Phi | Microsoft |
| `deepseek` | DeepSeek | DeepSeek |
| `kimi` | Kimi | Moonshot AI |
| `glm`, `chatglm` | GLM | Z.ai |
| `gpt-oss` | GPT-OSS | OpenAI |
| `granite` | Granite | IBM |
| `nemotron` | Nemotron | NVIDIA |
| `smollm` | SmolLM | Hugging Face |
| `falcon` | Falcon | TII |
| `yi-` | Yi | 01.AI |
| *(no match)* | `Other` | `Unknown` |

**Order matters and must be tested.** `DeepSeek-R1-Distill-Qwen-7B` matches both `deepseek` and `qwen` — DeepSeek must win, because it is the distributing family. Pin that exact case, plus `bartowski/gemma-2-9b-it-GGUF` → Google (proving the owner is ignored) and an unmatched name → `Other`/`Unknown`.

- [ ] **Step 3: `src/models/sort.ts` (TDD)**

```ts
export type SortKey =
	| 'recommended' | 'params-desc' | 'params-asc' | 'downloads'
	| 'size-asc' | 'name' | 'provider' | 'company' | 'family';

export function sortModels(models: ScoredModel[], key: SortKey): ScoredModel[];
```

Never mutate the input — return a copy. **Every comparator falls back to `score` descending on a tie**, so the grouping sorts (`provider`/`company`/`family`) still surface the best-fit model first inside each group; group names order A–Z. Test the tie-break explicitly — it is the part most likely to be dropped.

- [ ] **Step 4: Fetchers set `provider`; raise the result ceiling**

- `fetch.ts` — `provider: 'huggingface'` on each mapped row; `loadFallbackCatalog()` adds `provider: 'huggingface'` to validated rows (every `catalog.json` entry is a `huggingface.co` URL). The `isModelRecommendation` guard keeps validating the raw JSON shape and does **not** gain a `provider` check.
- `gpt4all.ts` — `provider: 'gpt4all'`.
- `constants.ts` — move `MAX_RESULTS` out of `score.ts`, set to **200**; add `PAGE_SIZE = 25`.
- `score.ts` — keep the `none`-tier drop and score ordering, slice at the new `MAX_RESULTS`, attach `family`/`company` via `classifyModel`.
- `fetch.ts` — raise HF `limit=100` → **`limit=500`**.

**✅ Measured against the live endpoint on 2026-07-31 — this is no longer a risk, do not re-derive it:**

| `limit` | rows | parseable size | after de-dupe | time | payload |
|---|---|---|---|---|---|
| 100 *(current)* | 100 | 85 | **68** | 859ms† | 0.05 MB |
| 200 | 200 | 162 | **125** | 281ms | 0.10 MB |
| 300 | 300 | 237 | **177** | 293ms | 0.15 MB |
| **500** | 500 | 410 | **318** | 412ms | 0.26 MB |
| 1000 | 1000 | 808 | **659** | 424ms | 0.54 MB |

† cold-start DNS/TLS; steady state is ~300–400ms at every size.

The endpoint honours every limit tested, and latency is flat — ~24× headroom against `TIMEOUT_MS`. **`limit=500` is chosen over 1000 for result *quality*, not performance**: sorted by downloads, rank 500+ is obscure repackagings. 500 yields ~318 usable models pre-hardware-filter, which `MAX_RESULTS = 200` then caps to 8 pages of 25 — ample.

Note this also explains the original complaint: at `limit=100` the pool was **already 68 usable models** and `MAX_RESULTS = 12` was showing 12 of them. The cap was the bottleneck, not the fetch.

Existing tests construct model literals and will fail to compile once `provider` is required. Updating them is mechanical — **do not weaken the types to avoid it.** Note `score.test.ts` currently asserts `toHaveLength(12)`; that assertion changes meaning and must be rewritten against `MAX_RESULTS`.

- [ ] **Step 5: Sidebar view replaces the editor panel**

`package.json` — add alongside the existing `commands`:

```json
"viewsContainers": {
	"activitybar": [
		{ "id": "localModelAdvisor", "title": "Local Model Advisor", "icon": "media/sidebar-icon.svg" }
	]
},
"views": {
	"localModelAdvisor": [
		{ "id": "localModelAdvisor.advisorView", "name": "Recommendations", "type": "webview" }
	]
}
```

`contributes.views` auto-generates the `onView:` activation event, so `activationEvents` stays absent (per Global Constraints).

`media/sidebar-icon.svg` — NEW. **`media/icon.svg` is not reusable**: it has a filled `#05060a` background rect and two accent colours, so it renders as a solid blob in the activity bar. The new file must be 24×24, single-colour, transparent-background stroke art (reuse the chip-outline motif; drop the background rect and the magenta core). `.vscodeignore` excludes the exact path `media/icon.svg`, so a new filename ships — but re-check the packaged file list.

`src/view.ts` — `AdvisorViewProvider implements vscode.WebviewViewProvider`, replacing `src/panel.ts`. It must carry over **every** guarantee the panel already had; these are the shipped fixes for Part D's C1/I1/I2, and losing them silently re-opens fixed bugs:

- registered with `{ webviewOptions: { retainContextWhenHidden: true } }`
- `lastMessage` cached and replayed on `onDidChangeVisibility` when visible
- `post()` short-circuits on a `disposed` flag set in `onDidDispose`
- `beginScan()` / `isCurrentScan()` generation counter, unchanged
- `getHtml()` moves over as-is — same strict CSP, same nonce, same `localResourceRoots: [dist]`

**New: a `ready` handshake.** A view resolves *lazily*, so the command path (`focus` → scan) can post before the webview script has loaded — a race the old panel never had, because it created the panel synchronously. The webview posts `{ type: 'ready' }` on load; the host replays `lastMessage` on receipt. This is the robust fix; `retainContextWhenHidden` alone is not.

`src/extension.ts` — `activate()` registers the provider into `context.subscriptions`; `local-model-advisor.scanHardware` runs `vscode.commands.executeCommand('localModelAdvisor.advisorView.focus')` (auto-registered for contributed views) then starts the scan; `scan` replaces `rescan` in `handleWebviewMessage`. The `openExternal`/`copy` allowlist in `src/validate.ts` is untouched.

- [ ] **Step 6: Webview — idle state, sort dropdown, numeric pager**

`src/webview/state.ts` — `filter` currently lives as a module-level `let` in `main.ts`, outside the tested reducer. Fold it into state with the new fields:

```ts
status: 'idle' | 'loading' | 'results' | 'error';   // 'idle' is new, and is initialState
filter: FitTier | 'all';
sort: SortKey;
page: number;
```

Host messages keep flowing through `reduce`. Add a **separate pure** `applyUiAction(state, action)` for local interactions (`setFilter`/`setSort`/`setPage`) so UI state stays as testable as host state — do not overload `ExtensionToWebview` with UI concerns. **Changing filter or sort resets `page` to 1**; a stale page number on a shorter list is the obvious bug here, so test it.

`src/webview/paginate.ts` (TDD) — `pageNumbers` is the Google-style windowed list: always show first and last, ellipsis for gaps, window of 5 around the current page. Test few pages (no ellipsis), current at start, current in middle (two ellipses), current at end, and `total === 0`.

`src/webview/main.ts` — add `renderIdle()` (title, one-line blurb, pulsing SCAN button — the first thing users see); a sort `<select>` above the list populated from the 9 `SortKey`s with an `aria-label`; the pager below the list with `aria-current="page"` on the current page. **Sorting runs client-side** via `sortModels` — instant, no re-scan, no host round trip. Row meta gains family/company/provider. Cap the staggered `row-in` animation at the first ~12 rows (25 × 45ms is a 1.1s entrance).

`tsconfig.webview.json` — `include` is currently `["src/webview", "src/models/types.ts"]`; add `src/models/sort.ts` and `src/models/constants.ts`. Keep it the only project with the `DOM` lib.

`src/webview/styles.css` — the current layout targets an 860px editor tab and breaks at a ~300px sidebar. Restructure **narrow-first**, then restore the roomy layout at `@media (min-width: 520px)` (in a webview, media queries resolve against the sidebar width, so this responds to the user dragging it wider):

| Selector | Narrow-first change |
|---|---|
| `#app` | drop `max-width: 860px`; padding `24px 20px` → `14px 12px` |
| `.model-row` | `grid-template-columns: 34px 1fr auto` → stacked: rank+name, meta, then badge+copy on their own row |
| `.hud-header` | `space-between` flex → stacked block |
| `.hw-grid` | `minmax(180px, 1fr)` → single column |
| `.sort-select`, `.pager` | NEW — full-width select; pager as a wrapping flex row of small square buttons |

Everything in `.claude/skills/neon-webview-ui` still binds: exact tokens, corner-cut `clip-path` (not border-radius), semantic tier colours, `--mono` everywhere, zero external resources, `textContent`-only rendering, and a `prefers-reduced-motion` block covering any new animation. **Run that skill's 8-item lifecycle checklist against the new view before calling this done** — it was written for exactly this kind of change.

- [ ] **Step 7: Docs and release**

- `README.md` — Usage is no longer "Ctrl+Shift+P"; lead with the activity-bar icon, then the sort/pagination controls.
- `CHANGELOG.md` — new `0.2.0` entry; `package.json` version `0.1.0` → `0.2.0`.
- `.claude/skills/model-recommendation-logic` — document the `provider` field, the taxonomy table and its "name, never owner" rule, the tie-break-on-score sorting rule, and the new `MAX_RESULTS`/`PAGE_SIZE`.
- **`media/screenshot.png`**: the README reference was removed on 2026-07-31 rather than left broken. Once Task 13's sidebar UI is stable, capture a screenshot of it and re-add the `![screenshot](media/screenshot.png)` line to `README.md`.

- [ ] **Step 8: Verify**

Per-module TDD first (failing test → implement → pass), per the model-recommendation-logic skill:

```bash
npx vitest run src/models/taxonomy.test.ts
npx vitest run src/models/sort.test.ts
npx vitest run src/webview/paginate.test.ts
```

Then the full gate — all must be clean:

```bash
npm run check-types     # both tsconfig projects
npm run lint
npm run test:unit       # currently 74 tests / 9 files; expect ~110+ / 12
npm run compile         # must emit no esbuild warnings
npm test                # real Electron host
npx vsce package        # confirm media/sidebar-icon.svg IS included
```

`src/webview/bundle.test.ts` already builds and executes the real webview IIFE against a DOM stub — **extend it** rather than working around it: assert the idle screen renders the SCAN button, that a `models` message renders exactly 25 rows plus a pager, that changing sort reorders without a host round trip, and that page 2 shows different rows.

**Manual pass (human-only):** F5 → click the activity-bar icon → idle screen with SCAN → click → results → change sort → page through → collapse the sidebar and re-open (results must **replay**, not reset to idle or strand on the radar) → disconnect the network and rescan for the amber offline banner.

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: sidebar webview with paginated results and sorting"
```

#### Risks

1. **`taxonomy.ts` is a hand-maintained list** that goes stale as new families ship. Unmatched names degrade to `Other`/`Unknown` rather than breaking — the right failure mode — but the sort is only as good as the table.
2. ~~**HF limit is unverified.**~~ **RESOLVED 2026-07-31** — probed the live endpoint at 100/200/300/500/1000. All limits are honoured, latency is flat at ~300–400ms (~24× headroom against `TIMEOUT_MS`), payload ≤0.54 MB. `limit=500` chosen for result quality, not performance. See the measurement table in Step 4.
3. **The view-lifecycle rewrite is where the shipped C1/I1/I2 fixes live.** Porting them is not optional, and the `ready` handshake is genuinely new surface — the riskiest part of this task after taxonomy.

---

## Final verification checklist (state after fix wave 2, 2026-07-31)

1. `npm run compile` — clean (both tsconfig projects + lint + dual bundle, no esbuild warnings). ✅ passing
2. `npm run test:unit` — all vitest suites green (estimate, score, fetch, dedupe, gpt4all, hardware, validate, state, bundle). ✅ **74/74 across 9 files**
3. `npm test` — integration smoke test green against the real Electron host. ✅ 1 passing
4. F5 manual pass per Task 9 Step 4, including the offline-fallback path. ❌ **not done — human only (D4)**
5. `npx vsce package` + local `.vsix` install — panel works from the packaged build. ⚠️ package ✅ (10 files, 124.85 KB, nothing leaked); local install still not done — `code` CLI is not on PATH in this environment (D4)
6. `git log --oneline` — one commit per task, working tree clean. ✅ clean, 4 commits awaiting push

---

# Part D — Outstanding work (post-review)

A final whole-branch review (base `c136d34` → head `367cdf6`) surfaced defects that the per-task reviews structurally could not see, because each of those only judged one task's diff against its own brief. Notably, the two most serious findings are **absences in this plan** rather than mistakes in the implementation — this plan never specified webview lifecycle behavior at all.

**Count: 18 code findings (1 Critical, 6 Important, 11 Minor) + 2 human-only tasks + Task 11.**

Ship gate: fix **Critical + Important (7 items)** before publishing. Minors are optional polish.

**STATUS: fully closed except D4.** D1 + D2 (all 7 ship-blocking items) fixed in fix wave 1 (`ccb4613`), independently reviewed and approved. D3 (all 11 minors), D5 (both tripwires) and D6 fixed in fix wave 2. **D4's 2 human-only tasks are the only outstanding items in Part D.** Everything below is kept as a historical record of what was wrong and why — it is not a to-do list any more.

## D1 — Critical (1) — ✅ FIXED in `ccb4613`

**C1. Webview strands on a fake "Scanning hardware" radar after a tab switch.**
`src/panel.ts` omits `retainContextWhenHidden`, so VS Code destroys the webview DOM when hidden and reloads the HTML when shown again. On reload `src/webview/main.ts` runs `renderLoading()` from fresh module state and nothing ever re-posts — there is no `onDidChangeViewState` listener, no ready handshake, and no `setState`/`getState`. `renderLoading()` also renders **no Rescan button** (unlike `renderError()`), so the only escape is closing the tab. Triggered by clicking any other editor tab and clicking back — users will hit this on first use.

Fix: cache the last `ExtensionToWebview` in `AdvisorPanel` and re-post it on `onDidChangeViewState` when visible; add `retainContextWhenHidden: true`; give the loading state a Rescan button as a backstop.

## D2 — Important (6) — ✅ FIXED in `ccb4613`

| # | Issue | Where |
|---|---|---|
| I1 | `post()` throws if the panel was disposed mid-scan (VS Code's `webview` getter calls `assertNotDisposed()`). Closing the panel during the ≤10s fetch throws, the catch tries to post an error, throws again, and escapes as an unhandled rejection. `AdvisorPanel.current = undefined` does not help — the in-flight closure holds the instance. | `src/panel.ts`, `src/extension.ts` |
| I2 | No in-flight guard in `runScan` — running the command twice or spamming Rescan starts N concurrent scans; a slow earlier scan can overwrite a newer result. Needs a generation counter and a disabled Rescan while scanning. | `src/extension.ts`, `src/webview/main.ts` |
| I3 | **`CPU_OVERHEAD_GB` duplicated and the two memory models disagree.** `minRamGB = ceil(size + 2)` is what the UI shows as "needs 7 GB", but the tier gate is `size + 2 <= ram * 0.75` (~9.1 GB for the same 8B model) — the user-facing number understates the real requirement by a third. The constant is baked in a third time in `catalog.json`. | `src/models/fetch.ts`, `score.ts`, `catalog.json` |
| I4 | Every failure collapses into "Offline mode — Hugging Face unreachable". A 401 from a stale token, a 429 rate limit, and a real outage are indistinguishable — and the token case actively lies to a user who configured something. Also swallows genuine `scoreModels` bugs. | `src/models/fetch.ts`, `src/webview/main.ts` |
| I5 | **The live catalog recommends models Ollama can't run as advertised.** Verified against the real endpoint: survivors include speech-recognition (`nemotron-…-asr-streaming`, `parakeet-…`) and image generation (`Flux2-Klein-9B`), each handed an "⧉ ollama run" button. Same sample has heavy near-duplicate spam (4+ repackagings of one model competing for the 12 slots). Needs `pipeline_tag=text-generation` and de-duplication on a normalized base name. | `src/models/fetch.ts` |
| I6 | Test coverage stops where the risk starts: no test pins the now-dominant `NN-B-ANB` MoE naming (`Qwen3-Coder-30B-A3B` must parse as **30**, not 3 — currently correct only by first-match accident); no test that `Authorization` is absent without a token; no `classifyFit` boundary tests; the webview reducer (where C1 lived) is entirely untested. | `src/models/*.test.ts`, `src/webview/main.ts` |

## D3 — Minor (11) — ✅ ALL FIXED in fix wave 2

| # | Issue | How it was fixed |
|---|---|---|
| 1 | `openExternal`/`copy` trust arbitrary webview strings — need an `https:` + `huggingface.co` allowlist (`src/extension.ts`). | New pure module `src/validate.ts` (+ 12 tests in `validate.test.ts`): `isAllowedExternalUrl` requires `https:` **and** an exact `huggingface.co` hostname (rejects `huggingface.co.evil.example` and `evilhuggingface.co`); `isAllowedCopyText` accepts only `^ollama run hf\.co/<owner>/<repo>$`, blocking appended `&&`/`;`/newline commands. Rejections surface a warning toast instead of failing silently. |
| 2 | Nonce uses `Math.random()`; `crypto.randomUUID()` is free (`src/panel.ts`). | `randomUUID()` from `node:crypto`, dashes stripped → 32 hex chars, valid per the CSP `base64-value` grammar. |
| 3 | MoE size math overestimates (`8x7B → 56B → 33.6 GB`; Mixtral is ~47B/~26 GB). Fine as conservative, worth a comment. | Comment added at the MoE branch in `estimate.ts` explaining the direction of the error and why conservative is the safe side (over-reporting only demotes a tier; under-reporting recommends a model the machine can't run). |
| 4 | Apple branch can render a contradiction: `gpuModel: null` + `vramGB: 23.4` → "None detected · 23.4 GB VRAM". | `deriveHardware` now names the integrated GPU from the CPU model when Apple unified memory applies and no controller was reported. Two new tests pin it, including the non-Apple no-controller case that must still report `null` / `0`. |
| 5 | Empty live result reports `source: 'live'` with zero models, blaming the user's hardware for an upstream problem. | New `'empty'` `FetchFailureReason`: when **both** sources answer successfully but yield nothing, `getRecommendations` returns `source: 'fallback'` with `reason: 'empty'` and the banner reads "Model index returned no usable entries" instead of falsely claiming the network was unreachable. A transport failure still reports its real reason. |
| 6 | `catalog as ModelRecommendation[]` is an unchecked assertion — a field missing from every row still compiles. | `isModelRecommendation()` runtime guard (exported + tested); `loadFallbackCatalog()` filters through it. A test asserts no bundled row is dropped, so a bad hand-edit to `catalog.json` fails the suite instead of shipping `NaN`. |
| 7 | `logLevel: 'silent'` hides esbuild warnings, and nothing executes the bundle in tests. | The problem-matcher plugin now prints `result.warnings` too. New `src/webview/bundle.test.ts` builds `main.ts` with esbuild and **executes the real IIFE** against a DOM stub — asserting zero warnings, successful init, rendered hardware/model rows, banner text, and the a11y attributes. |
| 8 | `extension?.activate()` silently no-ops on a wrong extension id. | `assert.ok(extension, …)` before `extension.activate()`; re-run against the real Electron host, still 1 passing. |
| 9 | Dead CSS `.model-meta b` — no `<b>` is ever emitted. | Rule deleted. |
| 10 | One tsconfig with `lib: ["ES2022","DOM"]` lets extension-host code reference `document` with no type error. | Root `tsconfig.json` drops `DOM` and excludes `src/webview`; new `tsconfig.webview.json` is the only project with `DOM`. `check-types` and `watch` run both. Verified by probe: `document.title` in a host file now fails with TS2584. |
| 11 | Filter chips lack `aria-pressed`; the copy button's only label is `⧉ ollama run`. | Chips carry `aria-pressed`, the wrapper has `role="group"` + `aria-label`; each copy button gets a distinguishing `aria-label` naming its model. Pinned by `bundle.test.ts`. |

## D4 — Human-only tasks (2)

1. **Capture `media/screenshot.png`** — F5 → open the sidebar → screenshot it. **Status 2026-07-31: the README reference was removed**, so there is no longer a broken link; this is now purely "add a screenshot when there is a stable UI to photograph" (i.e. after Task 13). **Note:** capturing it locally is not sufficient — vsce rewrites relative README image paths against `repository`, so the Marketplace page will fetch `https://raw.githubusercontent.com/VihaanR/local-model-advisor/HEAD/media/screenshot.png`. The PNG must be committed and pushed, or the listing stays broken.
2. **Local `.vsix` install sanity pass** — `code --install-extension local-model-advisor-0.1.0.vsix`, then run the command once. (`code` was not on PATH in the build environment.)

## D5 — Task 11 tripwires — ✅ BOTH ADDRESSED in fix wave 2

- ~~`repository.url` points at a repo that doesn't exist yet~~ — the repo now exists and is pushed. `homepage` and `bugs.url` were added to `package.json` alongside it, so the Marketplace sidebar links resolve.
- ~~`sharp` is a devDependency for one 7-line script~~ — **dropped from `devDependencies`** (removed 578 lines of platform binaries from `package-lock.json`, so `npm ci` in CI is faster and can no longer break on a `sharp` binary). `media/icon.png` stays committed; `scripts/render-icon.mjs` and the marketplace-release skill now both document the one-off `npm i --no-save sharp && node scripts/render-icon.mjs`.

## D6 — Process lesson — ✅ ACTED ON

Two of the three most serious findings were **absences in this plan**, not implementation errors. Per-task TDD review cannot catch "the plan never asked for X."

Both recommendations are now implemented:

- **Lifecycle checklist** added to `.claude/skills/neon-webview-ui` (fix wave 2) — 8 items covering hidden→shown reload, state replay, dispose safety, concurrent invocation, escape hatches from non-terminal states, reducer purity, building/executing the bundle in tests, and accessibility. Any future UI task inherits it via the skill.
- **`src/models/constants.ts`** as the single source for `CPU_OVERHEAD_GB`, `CTX_HEADROOM_GB`, `OS_RESERVE_FRACTION`, `Q4_GB_PER_B` (+ `TIMEOUT_MS`, added in Task 12) — implemented back in fix wave 1.
