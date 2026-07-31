import { describe, it, expect } from 'vitest';
import { reduce, initialState, fallbackBannerText } from './state';
import type { HardwareInfo, ScoredModel } from '../models/types';

const hw: HardwareInfo = { cpuModel: 'x', physicalCores: 8, ramGB: 16, gpuModel: null, vramGB: 0 };
const models: ScoredModel[] = [{
	name: 'm', modelId: 'a/m', paramsB: 7, estimatedSizeGB: 4.2, minRamGB: 9,
	downloads: 10, likes: 1, hfUrl: 'https://huggingface.co/a/m', tier: 'cpu', score: 100,
}];

describe('reduce', () => {
	it('scanning sets loading status and scanning true', () => {
		const next = reduce({ ...initialState, status: 'results', scanning: false }, { type: 'scanning' });
		expect(next.status).toBe('loading');
		expect(next.scanning).toBe(true);
	});
	it('hardware sets loading status and stores hardware, keeps scanning true', () => {
		const next = reduce(initialState, { type: 'hardware', hardware: hw });
		expect(next.status).toBe('loading');
		expect(next.hardware).toEqual(hw);
		expect(next.scanning).toBe(true);
	});
	it('models sets results status, stores models/source/reason, and clears scanning', () => {
		const next = reduce(initialState, { type: 'models', models, source: 'fallback', reason: 'auth' });
		expect(next.status).toBe('results');
		expect(next.models).toEqual(models);
		expect(next.source).toBe('fallback');
		expect(next.reason).toBe('auth');
		expect(next.scanning).toBe(false);
	});
	it('error sets error status, stores the message, and clears scanning', () => {
		const next = reduce(initialState, { type: 'error', message: 'boom' });
		expect(next.status).toBe('error');
		expect(next.errorMessage).toBe('boom');
		expect(next.scanning).toBe(false);
	});
	it('a scanning message after results clears stale hardware-independent fields correctly (state replay scenario)', () => {
		const afterResults = reduce(initialState, { type: 'models', models, source: 'live' });
		const replay = reduce(afterResults, { type: 'scanning' });
		expect(replay.status).toBe('loading');
		expect(replay.models).toEqual(models); // old results stay until new ones arrive; loader just overlays
	});
});

describe('fallbackBannerText', () => {
	it('gives a distinct message per failure reason', () => {
		expect(fallbackBannerText('auth')).toMatch(/token rejected/i);
		expect(fallbackBannerText('rate-limit')).toMatch(/rate limit/i);
		expect(fallbackBannerText('server')).toMatch(/issues/i);
		expect(fallbackBannerText('network')).toMatch(/unreachable/i);
		expect(fallbackBannerText('empty')).toMatch(/no usable entries/i);
		expect(fallbackBannerText(undefined)).toMatch(/unreachable/i);
	});
});
