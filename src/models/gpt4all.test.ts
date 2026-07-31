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
