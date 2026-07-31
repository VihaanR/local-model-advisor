---
name: neon-webview-ui
description: Use when creating or modifying ANY UI in the Local Model Advisor webview (styles.css, webview/main.ts, panel.ts HTML) — enforces the project's neon terminal design system, strict CSP rules, and the no-external-resources constraint
---

# Neon Webview UI — Design System Contract

The Local Model Advisor webview has a deliberate **neon terminal / CRT** aesthetic. It must never drift toward generic framework defaults (default-Tailwind look, rounded-2xl cards, purple-gradient AI slop). All UI work follows this contract.

## Tokens (exact values — do not invent new ones)

| Token | Value | Use |
|---|---|---|
| `--void` | `#05060a` | page background |
| `--panel` / `--panel-2` | `#0b0d14` / `#10131d` | card gradients |
| `--line` | `rgba(0,240,255,.22)` | all borders |
| `--cyan` | `#00f0ff` | primary, GPU tier, headings, glows |
| `--magenta` | `#ff2ec4` | hybrid tier, errors |
| `--amber` | `#ffb300` | CPU tier, warnings/banners |
| `--text` / `--text-bright` / `--text-dim` | `#c8d3e0` / `#eaf6ff` / `#5c6a7d` | body / emphasis / labels |
| `--mono` | `var(--vscode-editor-font-family, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace)` | ALL type — there is no sans font in this UI |

## Signature effects (reuse, don't reinvent)

- **Glow**: layered shadows, e.g. `text-shadow: 0 0 6px rgba(0,240,255,.8), 0 0 24px rgba(0,240,255,.35)` — never CSS `filter: blur()` on text.
- **CRT scanlines**: `body::after` fixed overlay, `repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 1px, transparent 1px 3px)`.
- **Grid background**: two 1px `linear-gradient`s at `32px 32px` over `--void`.
- **Corner-cut cards**: `clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))` — not border-radius.
- **Tier colors are semantic**: gpu=cyan, hybrid=magenta, cpu=amber. Applied to row `border-left` and `.badge`. Never repurpose them.
- **Motion**: radar sweep (conic-gradient + rotate), staggered `row-in` entrance (~45ms/row), pulse on the scan button. Every animation must be disabled in a `@media (prefers-reduced-motion: reduce)` block.
- Labels/headings: uppercase + generous `letter-spacing` (0.15–0.35em). No title-case buttons.

## Hard rules (security & marketplace review)

1. **Zero external resources.** No CDN scripts, no Google Fonts, no remote images. The CSP (`default-src 'none'`) blocks them anyway — do not weaken it.
2. Scripts only via `nonce`; styles/images only via `webview.cspSource`. HTML template lives in `src/panel.ts` `getHtml()`.
3. Network-derived strings (model names/ids from Hugging Face) are rendered with `textContent` / the `el()` helper — **never `innerHTML`**.
4. Webview code (`src/webview/`) must not import `vscode` — it talks to the host only via the typed messages in `src/models/types.ts` (`ExtensionToWebview` / `WebviewToExtension`). New UI actions = extend those unions first.
5. Assets ship from `dist/` only (`localResourceRoots`). New files must be added to the webview entry points in `esbuild.js`.

## Lifecycle checklist (verify EVERY item before calling webview work done)

A whole-branch review found that the two most serious defects in this UI were things the plan never asked for, not things it got wrong — a design doc describes what to render, and silently omits how the panel behaves over time. Per-task review cannot catch "nobody specified this." Walk this list explicitly instead.

1. **Hidden → shown.** Click another editor tab and back. VS Code destroys and reloads the webview DOM unless `retainContextWhenHidden: true`, and the frontend restarts from `initialState`. Either retain context or replay state on `onDidChangeViewState` — this panel does both (`AdvisorPanel.lastMessage`).
2. **State replay.** The host caches the last `ExtensionToWebview` and re-posts it when the panel becomes visible. Any new message type must be safe to receive twice, out of the blue, with no fresh scan behind it.
3. **Dispose safety.** `panel.webview` throws once disposed. Every post path goes through `AdvisorPanel.post()`, which short-circuits on `this.disposed`. Close the panel mid-scan and confirm no unhandled rejection — the `catch` handler posts too, so an unguarded throw there escapes twice.
4. **Concurrent invocation.** Re-running the command or spamming Rescan must not interleave results. Scans take a generation from `beginScan()`; a result is dropped unless `isCurrentScan(generation)` still holds. Disable the triggering control while `scanning` is true.
5. **Every non-terminal state needs an escape hatch.** A loading state with no Rescan button strands the user if the message that would clear it never arrives. Loading and error states both render one.
6. **Reducer stays pure and tested.** View state transitions live in `src/webview/state.ts` (`reduce`) so `state.test.ts` can cover them without a DOM. Rendering reads state; it never derives it.
7. **The bundle is built and executed in tests.** `src/webview/bundle.test.ts` builds `main.ts` with esbuild and runs it against a DOM stub, asserting zero warnings and a working render. A module-scope crash otherwise ships with a fully green suite.
8. **Accessibility.** Toggle controls carry `aria-pressed`; icon/repeated-label buttons carry a distinguishing `aria-label`. Colour alone never conveys tier — the text badge does.

## Files

- `src/webview/styles.css` — all styling (single file, no CSS-in-JS)
- `src/webview/main.ts` — rendering (vanilla TS, no framework)
- `src/webview/state.ts` — pure view-state reducer + banner text
- `src/panel.ts` — HTML shell, CSP, lifecycle, message plumbing
- `src/webview/tsconfig` boundary: `tsconfig.webview.json` is the only project with the `DOM` lib. The root `tsconfig.json` excludes `src/webview`, so extension-host code touching `document`/`window` fails to compile. `npm run check-types` runs both.
