import { describe, it, expect, vi, afterEach } from 'vitest';
import rawCatalog from './catalog.json';
import { fetchLiveModels, loadFallbackCatalog, getRecommendations, classifyFetchError, isModelRecommendation, HttpError } from './fetch';
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
		expect(out[0]).toMatchObject({ modelId: 'a/Llama-3.1-8B-GGUF', paramsB: 8, estimatedSizeGB: 4.8, minRamGB: 10 });
		const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer hf_test');
	});
	it('throws on a non-OK response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
		await expect(fetchLiveModels()).rejects.toThrow('429');
	});
	it('requests the text-generation pipeline filter', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
		vi.stubGlobal('fetch', fetchMock);
		await fetchLiveModels();
		const url = fetchMock.mock.calls[0][0] as string;
		expect(url).toContain('pipeline_tag=text-generation');
	});
	it('omits the Authorization header when no token is given', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
		vi.stubGlobal('fetch', fetchMock);
		await fetchLiveModels();
		const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
		expect(headers.Authorization).toBeUndefined();
	});
	it('de-duplicates re-packaged models, keeping the highest-download variant', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => [
				{ modelId: 'bartowski/Llama-3.1-8B-Instruct-GGUF', downloads: 100, likes: 5 },
				{ modelId: 'TheBloke/Llama-3.1-8B-Instruct-GGUF', downloads: 5000, likes: 50 },
			],
		});
		vi.stubGlobal('fetch', fetchMock);
		const out = await fetchLiveModels();
		expect(out).toHaveLength(1);
		expect(out[0].modelId).toBe('TheBloke/Llama-3.1-8B-Instruct-GGUF');
	});
});

describe('classifyFetchError', () => {
	it('classifies 401/403 as auth', () => {
		expect(classifyFetchError(new HttpError(401))).toBe('auth');
		expect(classifyFetchError(new HttpError(403))).toBe('auth');
	});
	it('classifies 429 as rate-limit', () => {
		expect(classifyFetchError(new HttpError(429))).toBe('rate-limit');
	});
	it('classifies 5xx as server', () => {
		expect(classifyFetchError(new HttpError(503))).toBe('server');
	});
	it('classifies other HTTP statuses as unknown', () => {
		expect(classifyFetchError(new HttpError(404))).toBe('unknown');
	});
	it('classifies a TypeError (network failure) as network', () => {
		expect(classifyFetchError(new TypeError('fetch failed'))).toBe('network');
	});
	it('classifies a non-Error value as unknown', () => {
		expect(classifyFetchError('boom')).toBe('unknown');
	});
});

describe('loadFallbackCatalog', () => {
	it('returns a usable bundled catalog', () => {
		const cat = loadFallbackCatalog();
		expect(cat.length).toBeGreaterThanOrEqual(10);
		expect(cat.every((m) => m.estimatedSizeGB > 0 && m.modelId.includes('/'))).toBe(true);
	});
	it('keeps every bundled row — the shipped catalog is well-formed', () => {
		expect(loadFallbackCatalog()).toHaveLength(rawCatalog.length);
	});
});

describe('isModelRecommendation', () => {
	const valid = {
		name: 'm', modelId: 'a/m', paramsB: 7, estimatedSizeGB: 4.2, minRamGB: 9,
		downloads: 10, likes: 1, hfUrl: 'https://huggingface.co/a/m',
	};
	it('accepts a fully-formed row', () => {
		expect(isModelRecommendation(valid)).toBe(true);
	});
	it('rejects a row with a field of the wrong type', () => {
		expect(isModelRecommendation({ ...valid, estimatedSizeGB: '4.2' })).toBe(false);
	});
	it('rejects a row with a missing field', () => {
		const { minRamGB, ...missing } = valid;
		void minRamGB;
		expect(isModelRecommendation(missing)).toBe(false);
	});
	it('rejects a NaN numeric field', () => {
		expect(isModelRecommendation({ ...valid, paramsB: Number.NaN })).toBe(false);
	});
	it('rejects non-objects', () => {
		expect(isModelRecommendation(null)).toBe(false);
		expect(isModelRecommendation('a/m')).toBe(false);
	});
});

describe('getRecommendations', () => {
	it('falls back to the bundled catalog when the network fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const { models, source } = await getRecommendations(hw);
		expect(source).toBe('fallback');
		expect(models.length).toBeGreaterThan(0);
	});

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

	it('blames the upstream index, not the hardware, when both sources answer with nothing usable', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
		const { models, source, reason } = await getRecommendations(hw);
		expect(source).toBe('fallback');
		expect(reason).toBe('empty');
		expect(models.length).toBeGreaterThan(0);
	});

	it('reports the transport failure reason, not "empty", when a source actually errored', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new HttpError(429)));
		const { source, reason } = await getRecommendations(hw);
		expect(source).toBe('fallback');
		expect(reason).toBe('rate-limit');
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
});
