import * as vscode from 'vscode';

const HF_TOKEN_KEY = 'localModelAdvisor.hfToken';

export function getHfToken(context: vscode.ExtensionContext): Promise<string | undefined> {
	return Promise.resolve(context.secrets.get(HF_TOKEN_KEY));
}

export async function promptAndStoreHfToken(context: vscode.ExtensionContext): Promise<void> {
	const token = await vscode.window.showInputBox({
		title: 'Hugging Face Token (optional — raises API rate limits)',
		prompt: 'Paste a read token from huggingface.co/settings/tokens. Leave empty and press Enter to clear the stored token.',
		password: true,
		ignoreFocusOut: true,
	});
	if (token === undefined) {
		return; // user pressed Esc
	}
	if (token.trim() === '') {
		await context.secrets.delete(HF_TOKEN_KEY);
		void vscode.window.showInformationMessage('Local Model Advisor: Hugging Face token cleared.');
		return;
	}
	await context.secrets.store(HF_TOKEN_KEY, token.trim());
	void vscode.window.showInformationMessage('Local Model Advisor: Hugging Face token saved securely.');
}
