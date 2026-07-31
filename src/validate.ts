/**
 * Guards for payloads arriving from the webview. The webview only ever sends values this
 * extension put there itself, but it renders network-derived model ids — so treat every
 * inbound string as untrusted and re-check it against the exact shapes the UI can emit.
 */

const ALLOWED_HOST = 'huggingface.co';

/** `owner/repo` as Hugging Face allows it: letters, digits, dot, dash, underscore. */
const OLLAMA_RUN_COMMAND = /^ollama run hf\.co\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/** True only for an https link to the Hugging Face host itself (not a look-alike domain). */
export function isAllowedExternalUrl(url: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	return parsed.protocol === 'https:' && parsed.hostname === ALLOWED_HOST;
}

/** True only for the exact `ollama run hf.co/<owner>/<repo>` command the model rows emit. */
export function isAllowedCopyText(text: string): boolean {
	return OLLAMA_RUN_COMMAND.test(text);
}
