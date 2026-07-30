import catalog from './catalog.json';
import { CPU_OVERHEAD_GB, OS_RESERVE_FRACTION } from './constants';
import { estimateSizeGB, parseParamCount } from './estimate';
import { scoreModels } from './score';
import type { CatalogSource, FetchFailureReason, HardwareInfo, ModelRecommendation, ScoredModel } from './types';

const HF_ENDPOINT = 'https://huggingface.co/api/models?filter=gguf&pipeline_tag=text-generation&sort=downloads&limit=100';
const TIMEOUT_MS = 10_000;

export class HttpError extends Error {
	constructor(public readonly status: number) {
		super(`Hugging Face API returned ${status}`);
	}
}

interface HfRow {
	modelId?: string;
	id?: string;
	downloads?: number;
	likes?: number;
}

/** Normalizes a model name to its underlying base so re-packaged quantizations collapse together. */
function normalizeBaseName(name: string): string {
	return name.toLowerCase().replace(/-gguf$/i, '').replace(/[^a-z0-9]+/g, '');
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
		throw new HttpError(res.status);
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

	const bestByName = new Map<string, ModelRecommendation>();
	for (const rec of out) {
		const key = normalizeBaseName(rec.name);
		const existing = bestByName.get(key);
		if (!existing || rec.downloads > existing.downloads) {
			bestByName.set(key, rec);
		}
	}
	return Array.from(bestByName.values());
}

export function loadFallbackCatalog(): ModelRecommendation[] {
	return catalog as ModelRecommendation[];
}

export function classifyFetchError(err: unknown): FetchFailureReason {
	if (err instanceof HttpError) {
		if (err.status === 401 || err.status === 403) { return 'auth'; }
		if (err.status === 429) { return 'rate-limit'; }
		if (err.status >= 500) { return 'server'; }
		return 'unknown';
	}
	if (err instanceof DOMException && err.name === 'AbortError') { return 'network'; }
	if (err instanceof TypeError) { return 'network'; }
	return 'unknown';
}

export async function getRecommendations(
	hw: HardwareInfo,
	opts: { token?: string } = {}
): Promise<{ models: ScoredModel[]; source: CatalogSource; reason?: FetchFailureReason }> {
	let live: ModelRecommendation[];
	try {
		live = await fetchLiveModels(opts);
	} catch (err) {
		return { models: scoreModels(loadFallbackCatalog(), hw), source: 'fallback', reason: classifyFetchError(err) };
	}
	return { models: scoreModels(live, hw), source: 'live' };
}
