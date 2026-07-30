import { describe, it, expect } from 'vitest';
import { classifyFit, scoreModels } from './score';
import type { HardwareInfo, ModelRecommendation } from './types';

const rig = (ramGB: number, vramGB: number): HardwareInfo => ({
	cpuModel: 'Test CPU', physicalCores: 8, ramGB, gpuModel: vramGB > 0 ? 'Test GPU' : null, vramGB,
});

const model = (id: string, sizeGB: number, downloads: number): ModelRecommendation => ({
	name: id, modelId: `test/${id}`, paramsB: sizeGB / 0.6, estimatedSizeGB: sizeGB,
	minRamGB: Math.ceil(sizeGB + 2), downloads, likes: 0, hfUrl: `https://huggingface.co/test/${id}`,
});

describe('classifyFit', () => {
	it('gpu when model + context headroom fits in VRAM', () => {
		expect(classifyFit(6, rig(16, 8))).toBe('gpu');
	});
	it('hybrid when it overflows VRAM but fits RAM and VRAM >= 4GB', () => {
		expect(classifyFit(10, rig(16, 8))).toBe('hybrid');
	});
	it('cpu when no usable GPU but fits in 75% of RAM with 2GB overhead', () => {
		expect(classifyFit(9, rig(16, 0))).toBe('cpu');
	});
	it('none when it cannot fit anywhere', () => {
		expect(classifyFit(11, rig(16, 0))).toBe('none');
	});
});

describe('scoreModels', () => {
	it('ranks gpu tier above cpu tier regardless of downloads', () => {
		const hw = rig(32, 8);
		const out = scoreModels([model('big-cpu', 15, 9_000_000), model('small-gpu', 5, 1_000)], hw);
		expect(out[0].name).toBe('small-gpu');
	});
	it('drops none-tier models and caps at 12 results', () => {
		const hw = rig(8, 0);
		const many = Array.from({ length: 20 }, (_, i) => model(`m${i}`, 2, i));
		const out = scoreModels([...many, model('whale', 40, 999)], hw);
		expect(out).toHaveLength(12);
		expect(out.some((m) => m.name === 'whale')).toBe(false);
	});
});
