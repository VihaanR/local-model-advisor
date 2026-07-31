import { Q4_GB_PER_B } from './constants';

const MOE_PATTERN = /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/i;
// "NNB-ANNB" MoE naming (total-B params, then active-B params): capture the total.
const MOE_ACTIVE_PATTERN = /(\d+(?:\.\d+)?)\s*b-a\d+(?:\.\d+)?\s*b\b/i;
// Same convention with segments reversed in the model name (e.g. "...-A3B-30B-...");
// capture the total, which now trails the "A<active>B" marker instead of leading it.
const MOE_ACTIVE_REVERSED_PATTERN = /a\d+(?:\.\d+)?\s*b-(\d+(?:\.\d+)?)\s*b\b/i;
const SINGLE_PATTERN = /(\d+(?:\.\d+)?)\s*b\b/i;

/** Billions of parameters parsed from a model id, or null if the name carries no size. */
export function parseParamCount(modelId: string): number | null {
	// MoE first: "8x7B" would otherwise be read as 7B by the single pattern.
	// Multiplying out deliberately overestimates — experts share attention and embedding
	// weights, so Mixtral-8x7B is ~47B (~26 GB at Q4), not the 56B (~33.6 GB) reported here.
	// Kept conservative on purpose: over-reporting size can only demote a model to a safer
	// tier, whereas under-reporting would recommend a model the machine cannot actually run.
	const moe = modelId.match(MOE_PATTERN);
	if (moe) {
		return parseInt(moe[1], 10) * parseFloat(moe[2]);
	}
	const moeActive = modelId.match(MOE_ACTIVE_PATTERN);
	if (moeActive) {
		return parseFloat(moeActive[1]);
	}
	const moeActiveReversed = modelId.match(MOE_ACTIVE_REVERSED_PATTERN);
	if (moeActiveReversed) {
		return parseFloat(moeActiveReversed[1]);
	}
	const single = modelId.match(SINGLE_PATTERN);
	if (single) {
		return parseFloat(single[1]);
	}
	return null;
}

/** Approximate on-disk/in-memory size at Q4 quantization: ~0.6 GB per billion params. */
export function estimateSizeGB(paramsB: number): number {
	return Math.round(paramsB * Q4_GB_PER_B * 10) / 10;
}
