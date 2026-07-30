export type FitTier = 'gpu' | 'hybrid' | 'cpu' | 'none';

export interface HardwareInfo {
	cpuModel: string;
	physicalCores: number;
	ramGB: number;
	gpuModel: string | null;
	vramGB: number;
}

export interface ModelRecommendation {
	name: string;
	modelId: string;
	paramsB: number;
	estimatedSizeGB: number;
	minRamGB: number;
	downloads: number;
	likes: number;
	hfUrl: string;
}

export interface ScoredModel extends ModelRecommendation {
	tier: FitTier;
	score: number;
}

export type CatalogSource = 'live' | 'fallback';

export type FetchFailureReason = 'network' | 'auth' | 'rate-limit' | 'server' | 'unknown';

export type ExtensionToWebview =
	| { type: 'scanning' }
	| { type: 'hardware'; hardware: HardwareInfo }
	| { type: 'models'; models: ScoredModel[]; source: CatalogSource; reason?: FetchFailureReason }
	| { type: 'error'; message: string };

export type WebviewToExtension =
	| { type: 'rescan' }
	| { type: 'openExternal'; url: string }
	| { type: 'copy'; text: string };
