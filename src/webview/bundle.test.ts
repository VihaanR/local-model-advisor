import { describe, it, expect } from 'vitest';
import * as esbuild from 'esbuild';
import type { ExtensionToWebview, ScoredModel } from '../models/types';

/**
 * The unit suite otherwise only tests the reducer — nothing ever built or ran the shipped
 * webview bundle, so a module-scope crash (the class of bug that stranded the panel on a fake
 * radar) would reach users with a fully green test run. This builds `main.ts` exactly the way
 * `esbuild.js` does and executes the result against a minimal DOM stub.
 */

interface StubNode {
	tagName: string;
	className: string;
	textContent: string;
	title: string;
	disabled: boolean;
	style: Record<string, string>;
	attrs: Record<string, string>;
	children: (StubNode | string)[];
	append(...kids: (StubNode | string)[]): void;
	replaceChildren(...kids: (StubNode | string)[]): void;
	addEventListener(type: string, handler: () => void): void;
	setAttribute(name: string, value: string): void;
}

function stubNode(tagName: string): StubNode {
	const node: StubNode = {
		tagName,
		className: '',
		textContent: '',
		title: '',
		disabled: false,
		style: {},
		attrs: {},
		children: [],
		append(...kids) { node.children.push(...kids); },
		replaceChildren(...kids) { node.children = [...kids]; },
		addEventListener() { /* clicks are not exercised here */ },
		setAttribute(name, value) { node.attrs[name] = value; },
	};
	return node;
}

/** Flattens all rendered text so assertions can look for what the user would actually see. */
function textOf(node: StubNode | string): string {
	if (typeof node === 'string') { return node; }
	return [node.textContent, ...node.children.map(textOf)].join(' ');
}

function collect(node: StubNode | string, out: StubNode[] = []): StubNode[] {
	if (typeof node !== 'string') {
		out.push(node);
		node.children.forEach((c) => collect(c, out));
	}
	return out;
}

async function buildWebviewBundle(): Promise<esbuild.BuildResult> {
	return esbuild.build({
		entryPoints: ['src/webview/main.ts'],
		bundle: true,
		format: 'iife',
		platform: 'browser',
		write: false,
		logLevel: 'silent',
	});
}

const model: ScoredModel = {
	name: 'Meta-Llama-3.1-8B-Instruct-GGUF', modelId: 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
	paramsB: 8, estimatedSizeGB: 4.8, minRamGB: 10, downloads: 2_400_000, likes: 1100,
	hfUrl: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF', tier: 'gpu', score: 3600,
};

describe('webview bundle', () => {
	it('builds with no errors and no warnings', async () => {
		const result = await buildWebviewBundle();
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
	}, 30_000);

	it('initialises against a DOM without throwing, and renders the loading state', async () => {
		const { app } = await runBundle();
		expect(textOf(app)).toContain('Local Model Advisor');
		expect(textOf(app)).toContain('Scanning hardware');
	}, 30_000);

	it('renders hardware and model rows when the host posts results', async () => {
		const { app, post } = await runBundle();
		post({ type: 'hardware', hardware: { cpuModel: 'AMD Ryzen 7', physicalCores: 8, ramGB: 32, gpuModel: 'RTX 3070', vramGB: 8 } });
		post({ type: 'models', models: [model], source: 'live' });

		const text = textOf(app);
		expect(text).toContain('AMD Ryzen 7');
		expect(text).toContain('Meta-Llama-3.1-8B-Instruct-GGUF');
		expect(text).toContain('GPU TURBO');
		expect(text).toContain('Rescan');
	}, 30_000);

	it('shows the fallback banner text for the reason the host reports', async () => {
		const { app, post } = await runBundle();
		post({ type: 'models', models: [model], source: 'fallback', reason: 'rate-limit' });
		expect(textOf(app)).toMatch(/rate limit/i);
	}, 30_000);

	it('marks the active filter chip with aria-pressed and labels the copy button', async () => {
		const { app, post } = await runBundle();
		post({ type: 'models', models: [model], source: 'live' });

		const nodes = collect(app);
		// Button-only: the wrapper div's className is "chips", which also startsWith("chip").
		const chips = nodes.filter((n) => n.tagName === 'button' && n.className.startsWith('chip'));
		expect(chips.length).toBeGreaterThan(0);
		expect(chips.every((c) => c.attrs['aria-pressed'] === 'true' || c.attrs['aria-pressed'] === 'false')).toBe(true);
		expect(chips.filter((c) => c.attrs['aria-pressed'] === 'true')).toHaveLength(1);

		const copy = nodes.find((n) => n.className === 'copy-btn');
		expect(copy?.attrs['aria-label']).toContain(model.modelId);
	}, 30_000);
});

/** Builds the real bundle and evaluates it with stubbed `document` / `window` / vscode API. */
async function runBundle(): Promise<{ app: StubNode; post: (m: ExtensionToWebview) => void }> {
	const result = await buildWebviewBundle();
	const code = result.outputFiles![0].text;

	const app = stubNode('div');
	let messageHandler: ((event: { data: ExtensionToWebview }) => void) | undefined;

	const documentStub = {
		getElementById: (id: string) => (id === 'app' ? app : null),
		createElement: (tag: string) => stubNode(tag),
	};
	const windowStub = {
		addEventListener: (type: string, handler: (event: { data: ExtensionToWebview }) => void) => {
			if (type === 'message') { messageHandler = handler; }
		},
	};
	const acquireVsCodeApi = () => ({ postMessage: () => { /* host is not under test here */ } });

	// The IIFE references these as bare globals; function parameters shadow them.
	new Function('window', 'document', 'acquireVsCodeApi', code)(windowStub, documentStub, acquireVsCodeApi);

	if (!messageHandler) {
		throw new Error('bundle did not subscribe to host messages');
	}
	const handler = messageHandler;
	return { app, post: (m: ExtensionToWebview) => handler({ data: m }) };
}
