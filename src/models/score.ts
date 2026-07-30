import type { FitTier, HardwareInfo, ModelRecommendation, ScoredModel } from './types';

const CTX_HEADROOM_GB = 0.8;     // KV-cache/context room on top of weights
const CPU_OVERHEAD_GB = 2;       // runtime + context when running on CPU
const OS_RESERVE_FRACTION = 0.25; // leave a quarter of RAM to the OS
const MAX_RESULTS = 12;

const TIER_WEIGHT: Record<FitTier, number> = { gpu: 3000, hybrid: 2000, cpu: 1000, none: 0 };

export function classifyFit(sizeGB: number, hw: HardwareInfo): FitTier {
	const usableRamGB = hw.ramGB * (1 - OS_RESERVE_FRACTION);
	if (hw.vramGB > 0 && sizeGB + CTX_HEADROOM_GB <= hw.vramGB) {
		return 'gpu';
	}
	const fitsCpu = sizeGB + CPU_OVERHEAD_GB <= usableRamGB;
	if (fitsCpu && hw.vramGB >= 4) {
		return 'hybrid';
	}
	if (fitsCpu) {
		return 'cpu';
	}
	return 'none';
}

export function scoreModels(models: ModelRecommendation[], hw: HardwareInfo): ScoredModel[] {
	return models
		.map((m): ScoredModel => {
			const tier = classifyFit(m.estimatedSizeGB, hw);
			return { ...m, tier, score: TIER_WEIGHT[tier] + Math.log10(m.downloads + 1) * 100 };
		})
		.filter((m) => m.tier !== 'none')
		.sort((a, b) => b.score - a.score)
		.slice(0, MAX_RESULTS);
}
