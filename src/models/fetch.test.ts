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
