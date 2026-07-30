export interface ModelRecommendation {
	name: string;
	modelId: string;
	estimatedSizeGB: number;
	minRamGB: number;
	downloads: number;
	hfUrl: string;
}

interface HFModel {
	modelId: string;
	downloads: number;
	likes: number;
	tags: string[];
}

function estimateSizeGB(modelId: string): number | null {
	const match = modelId.match(/(\d+\.?\d*)\s*b/i);
	if (!match) { return null; }
	const params = parseFloat(match[1]);
	// Q4 quant approximation: ~0.6 GB per billion parameters
	return Math.round(params * 0.6 * 10) / 10;
}

export async function fetchRecommendedModels(availableRamGB: number): Promise<ModelRecommendation[]> {
	const res = await fetch(
		'https://huggingface.co/api/models?filter=gguf&sort=downloads&limit=100&full=false',
		{ headers: { 'User-Agent': 'local-model-advisor-vscode/0.0.1' } }
	);
	if (!res.ok) { throw new Error(`HuggingFace API returned ${res.status}`); }
	const raw = await res.text();

	const models: HFModel[] = JSON.parse(raw);
	const recommendations: ModelRecommendation[] = [];

	for (const model of models) {
		const sizeGB = estimateSizeGB(model.modelId);
		if (sizeGB === null) { continue; }

		// Require 1.5 GB headroom above estimated model size
		const minRamGB = Math.ceil(sizeGB + 1.5);
		if (minRamGB > availableRamGB) { continue; }

		recommendations.push({
			name: model.modelId.split('/').pop() ?? model.modelId,
			modelId: model.modelId,
			estimatedSizeGB: sizeGB,
			minRamGB,
			downloads: model.downloads,
			hfUrl: `https://huggingface.co/${model.modelId}`,
		});
	}

	return recommendations
		.sort((a, b) => b.downloads - a.downloads)
		.slice(0, 10);
}
