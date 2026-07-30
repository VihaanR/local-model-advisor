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
