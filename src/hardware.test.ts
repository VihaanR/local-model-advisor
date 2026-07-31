import { describe, it, expect } from 'vitest';
import { deriveHardware } from './hardware';

const GB = 1024 * 1024 * 1024;

describe('deriveHardware', () => {
	it('converts totals and picks the highest-VRAM real GPU', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'AMD', brand: 'Ryzen 7 5800X', physicalCores: 8 },
			mem: { total: 32 * GB },
			graphics: { controllers: [
				{ model: 'Microsoft Basic Render Driver', vram: 0 },
				{ model: 'NVIDIA GeForce RTX 3070', vram: 8192 },
			] },
		});
		expect(hw).toEqual({ cpuModel: 'AMD Ryzen 7 5800X', physicalCores: 8, ramGB: 32, gpuModel: 'NVIDIA GeForce RTX 3070', vramGB: 8 });
	});
	it('reports no GPU when only virtual adapters exist', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'Intel', brand: 'i5-1240P', physicalCores: 12 },
			mem: { total: 16 * GB },
			graphics: { controllers: [{ model: 'Virtual Display Adapter', vram: null }] },
		});
		expect(hw.gpuModel).toBeNull();
		expect(hw.vramGB).toBe(0);
	});
	it('treats Apple silicon unified memory as ~65% usable VRAM', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'Apple', brand: 'M3 Pro', physicalCores: 11 },
			mem: { total: 36 * GB },
			graphics: { controllers: [{ model: 'Apple M3 Pro', vram: null }] },
		});
		expect(hw.vramGB).toBeCloseTo(23.4, 1);
		expect(hw.gpuModel).toBe('Apple M3 Pro');
	});
	it('never reports unified VRAM without naming a GPU, even with no controller reported', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'Apple', brand: 'M2', physicalCores: 8 },
			mem: { total: 16 * GB },
			graphics: { controllers: [] },
		});
		expect(hw.vramGB).toBeGreaterThan(0);
		expect(hw.gpuModel).toBe('Apple M2');
	});
	it('still reports no GPU on a non-Apple machine with no controller reported', () => {
		const hw = deriveHardware({
			cpu: { manufacturer: 'Intel', brand: 'i7-12700', physicalCores: 12 },
			mem: { total: 16 * GB },
			graphics: { controllers: [] },
		});
		expect(hw.gpuModel).toBeNull();
		expect(hw.vramGB).toBe(0);
	});
});
