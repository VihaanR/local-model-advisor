# Local Model Advisor — Design & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current OutputChannel prototype into a marketplace-publishable VS Code extension that scans CPU/RAM/GPU and presents ranked, hardware-fit local AI model recommendations in a neon-terminal Webview.

**Architecture:** Pure logic (size estimation, fit scoring, catalog) lives in small tested modules under `src/models/`; side-effectful shells (`hardware.ts`, `fetch.ts`, `panel.ts`, `extension.ts`) stay thin. A second esbuild bundle produces the webview frontend (`dist/webview.js` + `dist/styles.css`), which talks to the extension host over a typed postMessage protocol. Live data comes from the Hugging Face API with a bundled offline catalog as fallback.

**Tech Stack:** TypeScript 5.9 (strict), esbuild dual-bundle (node/cjs extension + browser/iife webview), `systeminformation` (hardware), Hugging Face REST API (no SDK), Vitest (unit tests), `@vscode/test-electron` (smoke test), vanilla TS + hand-rolled neon CSS webview (no framework, no CDN), `vsce` (packaging).

## Global Constraints

- `engines.vscode` must be `^1.120.0` (matches `@types/vscode ^1.120.0`). The current `^1.000.0` is a typo and must not survive.
- Webview must load **zero external resources** — no CDN scripts, no Google Fonts, no remote images. Strict CSP with nonce. This is both a security requirement and a marketplace-review requirement.
- No API key is ever hardcoded or committed. HF token → VS Code `SecretStorage`. Marketplace PAT → `vsce login` / GitHub Actions secret only.
- All pure logic gets a unit test **before** implementation (TDD). Vitest tests live next to the code (`src/models/*.test.ts`); the VS Code integration test stays in `src/test/`.
- UI aesthetic: neon terminal / CRT — **not** default-Tailwind-looking. Palette and effects defined in Task 8; future UI work must follow `.claude/skills/neon-webview-ui`.
- Commit after every task (messages given per task).

---

## Part A — What has already been done (audit, 2026-07-30)

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

### Task 11: CI + publish workflow

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

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

- [ ] **Step 2: Create `.github/workflows/publish.yml`** (manual trigger; reads the `VSCE_PAT` repo secret — see Part B)

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

- [ ] **Step 3: First-publish runbook (manual, one-time — also in `.claude/skills/marketplace-release`)**

1. Create the GitHub repo `VihaanR/local-model-advisor` and push (`git remote add origin … && git push -u origin master`).
2. Create a publisher at https://marketplace.visualstudio.com/manage — the ID you choose **must match `publisher` in `package.json`** (plan default: `vihaan-raut`).
3. Create the Azure DevOps PAT (Part B) and either `npx vsce login vihaan-raut` + `npx vsce publish` locally, or add it as the `VSCE_PAT` GitHub secret and run the Publish workflow.

- [ ] **Step 4: Commit**

```bash
git add .github
git commit -m "ci: build/test/package workflow and manual publish workflow"
```

---

## Final verification checklist (run after Task 11)

1. `npm run compile` — clean.
2. `npm run test:unit` — all vitest suites green (estimate, score, fetch, hardware).
3. `npm test` — integration smoke test green.
4. F5 manual pass per Task 9 Step 4, including the offline-fallback path.
5. `npx vsce package` + local `.vsix` install — panel works from the packaged build (catches `.vscodeignore` mistakes that F5 hides).
6. `git log --oneline` — one commit per task, working tree clean.
