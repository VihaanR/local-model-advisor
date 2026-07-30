import catalog from './catalog.json';
import { estimateSizeGB, parseParamCount } from './estimate';
import { scoreModels } from './score';
import type { CatalogSource, HardwareInfo, ModelRecommendation, ScoredModel } from './types';

const HF_ENDPOINT = 'https://huggingface.co/api/models?filter=gguf&sort=downloads&limit=100';
const TIMEOUT_MS = 10_000;
const CPU_OVERHEAD_GB = 2;

interface HfRow {
	modelId?: string;
	id?: string;
	downloads?: number;
	likes?: number;
}

export async function fetchLiveModels(
	opts: { token?: string; signal?: AbortSignal } = {}
): Promise<ModelRecommendation[]> {
	const headers: Record<string, string> = { 'User-Agent': 'local-model-advisor-vscode' };
	if (opts.token) {
		headers.Authorization = `Bearer ${opts.token}`;
	}
	const res = await fetch(HF_ENDPOINT, {
		headers,
		signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok) {
		throw new Error(`Hugging Face API returned ${res.status}`);
	}
	const rows = (await res.json()) as HfRow[];
	const out: ModelRecommendation[] = [];
	for (const row of rows) {
		const modelId = row.modelId ?? row.id;
		if (!modelId) {
			continue;
		}
		const paramsB = parseParamCount(modelId);
		if (paramsB === null) {
			continue;
		}
		const sizeGB = estimateSizeGB(paramsB);
		out.push({
			name: modelId.split('/').pop() ?? modelId,
			modelId,
			paramsB,
			estimatedSizeGB: sizeGB,
			minRamGB: Math.ceil(sizeGB + CPU_OVERHEAD_GB),
			downloads: row.downloads ?? 0,
			likes: row.likes ?? 0,
			hfUrl: `https://huggingface.co/${modelId}`,
		});
	}
	return out;
}

export function loadFallbackCatalog(): ModelRecommendation[] {
	return catalog as ModelRecommendation[];
}

export async function getRecommendations(
	hw: HardwareInfo,
	opts: { token?: string } = {}
): Promise<{ models: ScoredModel[]; source: CatalogSource }> {
	try {
		const live = await fetchLiveModels(opts);
		return { models: scoreModels(live, hw), source: 'live' };
	} catch {
		return { models: scoreModels(loadFallbackCatalog(), hw), source: 'fallback' };
	}
}
