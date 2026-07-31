import catalog from './catalog.json';
import { CPU_OVERHEAD_GB, OS_RESERVE_FRACTION, TIMEOUT_MS } from './constants';
import { dedupeByName } from './dedupe';
import { HttpError, classifyFetchError } from './errors';
import { estimateSizeGB, parseParamCount } from './estimate';
import { fetchGpt4AllModels } from './gpt4all';
import { scoreModels } from './score';
import type { CatalogSource, FetchFailureReason, HardwareInfo, ModelRecommendation, ScoredModel } from './types';

export { HttpError, classifyFetchError };

const HF_ENDPOINT = 'https://huggingface.co/api/models?filter=gguf&pipeline_tag=text-generation&sort=downloads&limit=100';

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
		throw new HttpError(res.status, `Hugging Face API returned ${res.status}`);
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
			minRamGB: Math.ceil((sizeGB + CPU_OVERHEAD_GB) / (1 - OS_RESERVE_FRACTION)),
			downloads: row.downloads ?? 0,
			likes: row.likes ?? 0,
			hfUrl: `https://huggingface.co/${modelId}`,
		});
	}

	return dedupeByName(out);
}

export function loadFallbackCatalog(): ModelRecommendation[] {
	return catalog as ModelRecommendation[];
}

export async function getRecommendations(
	hw: HardwareInfo,
	opts: { token?: string } = {}
): Promise<{ models: ScoredModel[]; source: CatalogSource; reason?: FetchFailureReason }> {
	const [hfResult, gpt4AllResult] = await Promise.allSettled([
		fetchLiveModels(opts),
		fetchGpt4AllModels(),
	]);

	const live: ModelRecommendation[] = [
		...(hfResult.status === 'fulfilled' ? hfResult.value : []),
		...(gpt4AllResult.status === 'fulfilled' ? gpt4AllResult.value : []),
	];

	if (live.length > 0) {
		return { models: scoreModels(dedupeByName(live), hw), source: 'live' };
	}

	const primaryError = hfResult.status === 'rejected' ? hfResult.reason
		: gpt4AllResult.status === 'rejected' ? gpt4AllResult.reason
		: undefined;
	return { models: scoreModels(loadFallbackCatalog(), hw), source: 'fallback', reason: classifyFetchError(primaryError) };
}
