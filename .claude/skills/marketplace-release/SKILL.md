---
name: marketplace-release
description: Use when packaging, versioning, or publishing Local Model Advisor to the VS Code Marketplace — vsce runbook, PAT handling, and the pre-flight checklist that must pass before any publish
---

# Marketplace Release Runbook

## Pre-flight checklist (ALL must pass — no exceptions, no "publish now, fix later")

1. `npm run compile` — clean (type-check + lint + bundle).
2. `npm run test:unit` — all vitest suites green.
3. `npm test` — VS Code integration smoke test green.
4. Manual F5 pass: scan works, model rows render, copy button toasts, HF links open, **offline fallback shows the amber banner** (disconnect network → Rescan).
5. Version bumped in `package.json` (semver) AND a matching `CHANGELOG.md` entry added.
6. `npx vsce package` → install the produced `.vsix` via `code --install-extension <file>.vsix` and run the command once. This catches `.vscodeignore` mistakes (missing `dist/styles.css`, missing icon) that F5 hides.
7. If model landscape shifted: refresh `src/models/catalog.json` (see model-recommendation-logic skill).

## Identity invariants

- `publisher` in `package.json` must EXACTLY match the publisher ID created at https://marketplace.visualstudio.com/manage (default: `vihaan-raut`).
- `icon` → `media/icon.png` (PNG only — marketplace rejects SVG). `media/icon.png` is committed. To regenerate from `media/icon.svg`: `npm i --no-save sharp && node scripts/render-icon.mjs` — `sharp` is intentionally not a devDependency (large platform binary, would slow/break `npm ci` in CI for a script that runs once per icon change).
- `repository.url` must point at a real, pushed GitHub repo or the listing loses its links.

## Secrets (never in the repo — grep for `hf_` and PAT-like strings before pushing)

- **Marketplace PAT**: Azure DevOps → User settings → PAT → Organization: *All accessible organizations*, Scope: *Marketplace → Manage*.
  - Local publish: `npx vsce login <publisher>` (stores PAT in OS credential store), then `npx vsce publish`.
  - CI publish: GitHub repo → Settings → Secrets → Actions → `VSCE_PAT`, then run the manual `Publish` workflow (`.github/workflows/publish.yml`).
- **Hugging Face token**: runtime-only, user-provided via the `Set Hugging Face Token` command into SecretStorage. It plays no role in publishing.

## Publish

```
npx vsce publish            # after vsce login; reads version from package.json
```

or GitHub → Actions → Publish → Run workflow. Afterwards verify the listing renders (icon, README images, badges) at
`https://marketplace.visualstudio.com/items?itemName=<publisher>.local-model-advisor` — README image paths must be repo-relative and pushed, or they 404 on the listing page.
