import type { FetchFailureReason } from './types';

export class HttpError extends Error {
	constructor(public readonly status: number, message = `Request failed with status ${status}`) {
		super(message);
	}
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
