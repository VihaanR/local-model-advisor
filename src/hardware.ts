import si from 'systeminformation';
import type { HardwareInfo } from './models/types';

const GB = 1024 * 1024 * 1024;
const VIRTUAL_GPU = /basic render|virtual|remote|parsec/i;
const APPLE_UNIFIED_FRACTION = 0.65;

export interface RawHardware {
	cpu: { manufacturer: string; brand: string; physicalCores: number };
	mem: { total: number };
	graphics: { controllers: { model: string; vram: number | null }[] };
}

export function deriveHardware(raw: RawHardware): HardwareInfo {
	const ramGB = Math.round((raw.mem.total / GB) * 10) / 10;
	const real = raw.graphics.controllers.filter((c) => c.model && !VIRTUAL_GPU.test(c.model));
	const best = real.reduce<{ model: string; vram: number | null } | null>(
		(top, c) => (!top || (c.vram ?? 0) > (top.vram ?? 0) ? c : top),
		null
	);
	const cpuModel = `${raw.cpu.manufacturer} ${raw.cpu.brand}`.trim();
	let vramGB = best?.vram ? Math.round((best.vram / 1024) * 10) / 10 : 0;
	let gpuModel = best?.model ?? null;
	// Apple silicon: unified memory — the GPU can address most of system RAM.
	if (/apple/i.test(raw.cpu.manufacturer)) {
		vramGB = Math.round(ramGB * APPLE_UNIFIED_FRACTION * 10) / 10;
		// The integrated GPU is always present on these chips even when no controller is
		// reported; naming it keeps the UI from showing "None detected · 23.4 GB VRAM".
		gpuModel = gpuModel ?? cpuModel;
	}
	return {
		cpuModel,
		physicalCores: raw.cpu.physicalCores,
		ramGB,
		gpuModel,
		vramGB,
	};
}

export async function scanHardware(): Promise<HardwareInfo> {
	const [cpu, mem, graphics] = await Promise.all([si.cpu(), si.mem(), si.graphics()]);
	return deriveHardware({
		cpu: { manufacturer: cpu.manufacturer, brand: cpu.brand, physicalCores: cpu.physicalCores },
		mem: { total: mem.total },
		graphics: { controllers: graphics.controllers.map((c) => ({ model: c.model ?? '', vram: c.vram })) },
	});
}
