import type { ModelRecommendation } from './types';

function normalizeBaseName(name: string): string {
	return name.toLowerCase().replace(/-gguf$/i, '').replace(/[^a-z0-9]+/g, '');
}

/** Collapses re-packaged/duplicate listings of the same underlying model, keeping the highest-download variant. */
export function dedupeByName(models: ModelRecommendation[]): ModelRecommendation[] {
	const bestByName = new Map<string, ModelRecommendation>();
	for (const rec of models) {
		const key = normalizeBaseName(rec.name);
		const existing = bestByName.get(key);
		if (!existing || rec.downloads > existing.downloads) {
			bestByName.set(key, rec);
		}
	}
	return Array.from(bestByName.values());
}
