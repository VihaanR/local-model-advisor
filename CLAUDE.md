# local-model-advisor

VS Code extension that scans hardware and recommends local AI models.

## Project Type
- VS Code extension — commands registered in `package.json` under `contributes.commands`
- Bundled with esbuild (`esbuild.js`), not webpack; output goes to `dist/extension.js`
- Entry point: `src/extension.ts`

## Key Dependency
- `systeminformation` — used for cross-platform CPU/RAM/GPU detection

## Architecture

1. Hardware scan via `src/hardware.ts` (`scanHardware()` shell + pure `deriveHardware()`) using `systeminformation` (CPU, RAM, GPU/VRAM).
2. Model recommendation logic lives in `src/models/`:
   - `types.ts` — shared interfaces + webview message protocol
   - `estimate.ts` — model name → parameter count → size
   - `score.ts` — hardware fit tiers (GPU TURBO / HYBRID / CPU OK) + ranking
   - `fetch.ts` — live Hugging Face GGUF catalog fetch, with silent fallback to the bundled `catalog.json` when offline
   - `catalog.json` — bundled offline fallback catalog
3. `src/secrets.ts` — optional Hugging Face token stored via VS Code SecretStorage.
4. Results are displayed in a neon-terminal-styled Webview panel: `src/panel.ts` (HTML shell, CSP, message plumbing) + `src/webview/` (`main.ts` rendering/state, `styles.css` styling) — not `showInformationMessage`.

## Build Commands
- `npm run compile` — type-check + lint + bundle
- `npm run watch` — parallel watch mode for esbuild + tsc
- `npm run package` — production bundle
- `npm run test:unit` — vitest unit tests for the pure logic in `src/models/` and `src/hardware.ts`

## Project Skills

Skill files live in `.claude/skills/`:
- `neon-webview-ui` — design system contract (tokens, effects, CSP rules) for any change to the webview UI
- `model-recommendation-logic` — estimation constants, fit-tier rules, fallback catalog policy, and TDD requirement for `src/models/*` and `src/hardware.ts`
- `marketplace-release` — vsce packaging/publishing runbook and pre-flight checklist
