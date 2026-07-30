import type { CatalogSource, ExtensionToWebview, FetchFailureReason, HardwareInfo, ScoredModel } from '../models/types';

export type ViewStatus = 'loading' | 'results' | 'error';

export interface WebviewState {
	status: ViewStatus;
	hardware: HardwareInfo | null;
	models: ScoredModel[];
	source: CatalogSource;
	reason?: FetchFailureReason;
	errorMessage: string;
	scanning: boolean;
}

export const initialState: WebviewState = {
	status: 'loading',
	hardware: null,
	models: [],
	source: 'live',
	reason: undefined,
	errorMessage: '',
	scanning: true,
};

export function reduce(state: WebviewState, message: ExtensionToWebview): WebviewState {
	switch (message.type) {
		case 'scanning':
			return { ...state, status: 'loading', scanning: true };
		case 'hardware':
			return { ...state, status: 'loading', hardware: message.hardware, scanning: true };
		case 'models':
			return { ...state, status: 'results', models: message.models, source: message.source, reason: message.reason, scanning: false };
		case 'error':
			return { ...state, status: 'error', errorMessage: message.message, scanning: false };
	}
}

export function fallbackBannerText(reason?: FetchFailureReason): string {
	switch (reason) {
		case 'auth':
			return 'Hugging Face token rejected — check "Set Hugging Face Token". Showing bundled catalog.';
		case 'rate-limit':
			return 'Hugging Face rate limit hit — showing bundled catalog.';
		case 'server':
			return 'Hugging Face is having issues right now — showing bundled catalog.';
		case 'network':
		case 'unknown':
		default:
			return 'Offline mode — Hugging Face unreachable. Showing bundled catalog.';
	}
}
