import { describe, it, expect } from 'vitest';
import { dedupeByName } from './dedupe';
import type { ModelRecommendation } from './types';

const rec = (name: string, downloads: number): ModelRecommendation => ({
	name, modelId: `pub/${name}`, paramsB: 7, estimatedSizeGB: 4.2, minRamGB: 9, downloads, likes: 0,
	hfUrl: `https://huggingface.co/pub/${name}`,
});

describe('dedupeByName', () => {
	it('keeps the highest-download variant among same-name entries', () => {
		const out = dedupeByName([rec('Llama-3.1-8B-Instruct-GGUF', 100), rec('Llama-3.1-8B-Instruct-GGUF', 5000)]);
		expect(out).toHaveLength(1);
		expect(out[0].downloads).toBe(5000);
	});
	it('is case/suffix/punctuation insensitive when matching names', () => {
		const out = dedupeByName([rec('Foo-Bar-GGUF', 10), rec('foo bar', 20)]);
		expect(out).toHaveLength(1);
		expect(out[0].downloads).toBe(20);
	});
	it('keeps distinct models separate', () => {
		const out = dedupeByName([rec('Alpha', 10), rec('Beta', 20)]);
		expect(out).toHaveLength(2);
	});
});
