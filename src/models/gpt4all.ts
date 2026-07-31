import { CPU_OVERHEAD_GB, OS_RESERVE_FRACTION, TIMEOUT_MS } from './constants';
import { HttpError } from './errors';
import type { ModelRecommendation } from './types';

const GPT4ALL_ENDPOINT = 'https://gpt4all.io/models/models3.json';
const HF_RESOLVE_PATTERN = /^https:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\//i;
const PARAMS_PATTERN = /^([\d.]+)\s*(billion|million)\b/i;

interface Gpt4AllRow {
	name?: string;
	url?: string;
	filesize?: string;
	parameters?: string;
}

function parseParamsB(raw: string | undefined): number | null {
	if (!raw) { return null; }
	const m = raw.match(PARAMS_PATTERN);
	if (!m) { return null; }
	const n = parseFloat(m[1]);
	return m[2].toLowerCase() === 'million' ? n / 1000 : n;
}

export async function fetchGpt4AllModels(
	opts: { signal?: AbortSignal } = {}
): Promise<ModelRecommendation[]> {
	const res = await fetch(GPT4ALL_ENDPOINT, {
		signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok) {
		throw new HttpError(res.status, `GPT4All catalog returned ${res.status}`);
	}
	const rows = (await res.json()) as Gpt4AllRow[];
	const out: ModelRecommendation[] = [];
	for (const row of rows) {
		const urlMatch = row.url?.match(HF_RESOLVE_PATTERN);
		if (!urlMatch) {
			continue; // not Hugging-Face-hosted — no valid "ollama run hf.co/..." command is possible
		}
		const modelId = urlMatch[1];
		const paramsB = parseParamsB(row.parameters);
		const filesizeBytes = row.filesize ? Number(row.filesize) : NaN;
		if (paramsB === null || !Number.isFinite(filesizeBytes) || filesizeBytes <= 0) {
			continue;
		}
		const estimatedSizeGB = Math.round((filesizeBytes / 1024 ** 3) * 10) / 10;
		out.push({
			name: row.name ?? modelId.split('/').pop() ?? modelId,
			modelId,
			paramsB,
			estimatedSizeGB,
			minRamGB: Math.ceil((estimatedSizeGB + CPU_OVERHEAD_GB) / (1 - OS_RESERVE_FRACTION)),
			downloads: 0,
			likes: 0,
			hfUrl: `https://huggingface.co/${modelId}`,
		});
	}
	return out;
}
