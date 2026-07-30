import { describe, it, expect } from 'vitest';
import { parseParamCount, estimateSizeGB } from './estimate';

describe('parseParamCount', () => {
	it('parses a plain size like 8B', () => {
		expect(parseParamCount('meta-llama/Meta-Llama-3.1-8B-Instruct-GGUF')).toBe(8);
	});
	it('parses decimal sizes like 1.1B', () => {
		expect(parseParamCount('TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF')).toBe(1.1);
	});
	it('does not mistake version numbers (3.1, v0.1) for sizes', () => {
		expect(parseParamCount('Qwen/Qwen2.5-Coder-32B-Instruct-GGUF')).toBe(32);
	});
	it('handles MoE names: 8x7B totals 56', () => {
		expect(parseParamCount('TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF')).toBe(56);
	});
	it('does not match "8bit" as 8B (word boundary)', () => {
		expect(parseParamCount('someone/model-8bit-GGUF')).toBeNull();
	});
	it('returns null when no size is present', () => {
		expect(parseParamCount('microsoft/phi-4-gguf')).toBeNull();
	});
	it('parses MoE "total-B-active-B" names, taking the total not the active count', () => {
		expect(parseParamCount('Qwen/Qwen3-Coder-30B-A3B-Instruct-GGUF')).toBe(30);
	});
	it('is not order-dependent: active-params segment before the total also parses correctly', () => {
		expect(parseParamCount('Qwen/Qwen3-A3B-30B-Coder-GGUF')).toBe(30);
	});
});

describe('estimateSizeGB', () => {
	it('uses ~0.6 GB per billion params (Q4), 1 decimal', () => {
		expect(estimateSizeGB(8)).toBe(4.8);
		expect(estimateSizeGB(1.1)).toBe(0.7);
		expect(estimateSizeGB(56)).toBe(33.6);
	});
});
