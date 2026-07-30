const MOE_PATTERN = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/i;
const SINGLE_PATTERN = /(\d+(?:\.\d+)?)\s*b\b/i;

/** Billions of parameters parsed from a model id, or null if the name carries no size. */
export function parseParamCount(modelId: string): number | null {
	// MoE first: "8x7B" would otherwise be read as 7B by the single pattern.
	const moe = modelId.match(MOE_PATTERN);
	if (moe) {
		return parseInt(moe[1], 10) * parseFloat(moe[2]);
	}
	const single = modelId.match(SINGLE_PATTERN);
	if (single) {
		return parseFloat(single[1]);
	}
	return null;
}

/** Approximate on-disk/in-memory size at Q4 quantization: ~0.6 GB per billion params. */
export function estimateSizeGB(paramsB: number): number {
	return Math.round(paramsB * 0.6 * 10) / 10;
}
