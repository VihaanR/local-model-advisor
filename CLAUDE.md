# local-model-advisor

VS Code extension that scans hardware and recommends local AI models.

## Project Type
- VS Code extension — commands registered in `package.json` under `contributes.commands`
- Bundled with esbuild (`esbuild.js`), not webpack; output goes to `dist/extension.js`
- Entry point: `src/extension.ts`

## Key Dependency
- `systeminformation` — used for cross-platform CPU/RAM/GPU detection

## Planned Architecture
1. Hardware scan via `systeminformation` (CPU, RAM, GPU)
2. Static model requirements map (`src/models.json` or similar) — min RAM, GPU optional flag, etc.
3. Compare hardware against map → ranked recommendations
4. Display results in a Webview panel (not `showInformationMessage`)

## Known Issue (as of session start)
- `src/extension.ts` has an unclosed `try` block — brace mismatch around line 21–31; no `catch` present

## Build Commands
- `npm run compile` — type-check + lint + bundle
- `npm run watch` — parallel watch mode for esbuild + tsc
- `npm run package` — production bundle
