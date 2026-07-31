import type {
	ExtensionToWebview, FitTier, ScoredModel, WebviewToExtension,
} from '../models/types';
import { reduce, initialState, fallbackBannerText, type WebviewState } from './state';

declare function acquireVsCodeApi(): { postMessage(msg: WebviewToExtension): void };
const vscode = acquireVsCodeApi();

const app = document.getElementById('app') as HTMLElement;

let state: WebviewState = initialState;
let filter: FitTier | 'all' = 'all';

const TIER_LABEL: Record<FitTier, string> = { gpu: 'GPU TURBO', hybrid: 'HYBRID', cpu: 'CPU OK', none: '—' };

window.addEventListener('message', (event: MessageEvent<ExtensionToWebview>) => {
	state = reduce(state, event.data);
	render();
});

function render(): void {
	switch (state.status) {
		case 'loading':
			renderLoading();
			break;
		case 'results':
			renderResults();
			break;
		case 'error':
			renderError();
			break;
	}
}

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

function hardwareGrid(): HTMLElement {
	const hw = state.hardware;
	if (!hw) { return el('div'); }
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
	if (state.hardware) { app.append(hardwareGrid()); }
	const wrap = el('div', 'radar-wrap');
	wrap.append(el('div', 'radar'), el('div', 'radar-label', state.hardware ? 'Querying model index' : 'Scanning hardware'));
	app.append(wrap);
	app.append(rescanButton(state.scanning));
}

function renderError(): void {
	app.replaceChildren(header());
	if (state.hardware) { app.append(hardwareGrid()); }
	app.append(el('div', 'error-box', `SIGNAL LOST — ${state.errorMessage}`));
	app.append(rescanButton(state.scanning));
}

function renderResults(): void {
	app.replaceChildren(header());
	if (state.hardware) { app.append(hardwareGrid()); }

	if (state.source === 'fallback') {
		app.append(el('div', 'banner', fallbackBannerText(state.reason)));
	}

	const chips = el('div', 'chips');
	chips.setAttribute('role', 'group');
	chips.setAttribute('aria-label', 'Filter models by hardware fit');
	const options: (FitTier | 'all')[] = ['all', 'gpu', 'hybrid', 'cpu'];
	for (const opt of options) {
		const chip = el('button', `chip${filter === opt ? ' active' : ''}`, opt === 'all' ? 'All' : TIER_LABEL[opt]);
		// The active chip is styled, not just selected — screen readers need it stated explicitly.
		chip.setAttribute('aria-pressed', String(filter === opt));
		chip.addEventListener('click', () => { filter = opt; renderResults(); });
		chips.append(chip);
	}
	app.append(chips);

	const visible = state.models.filter((m: ScoredModel) => filter === 'all' || m.tier === filter);
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
		// Visible label is "⧉ ollama run" for every row — without this each button is
		// indistinguishable to a screen reader.
		copy.setAttribute('aria-label', `Copy ollama run command for ${m.modelId}`);
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
	app.append(rescanButton(state.scanning));
}

function rescanButton(disabled: boolean): HTMLElement {
	const btn = el('button', 'scan-btn', disabled ? 'Scanning…' : 'Rescan');
	btn.disabled = disabled;
	btn.addEventListener('click', () => vscode.postMessage({ type: 'rescan' }));
	return btn;
}

render();
