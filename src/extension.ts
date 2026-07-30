import * as vscode from 'vscode';
import { scanHardware } from './hardware';
import { getRecommendations } from './models/fetch';
import { AdvisorPanel } from './panel';
import { getHfToken, promptAndStoreHfToken } from './secrets';
import type { WebviewToExtension } from './models/types';

export function activate(context: vscode.ExtensionContext) {
	const scanCommand = vscode.commands.registerCommand('local-model-advisor.scanHardware', () => {
		const panel = AdvisorPanel.show(context.extensionUri, (m) => handleWebviewMessage(context, m));
		void runScan(context, panel);
	});

	const tokenCommand = vscode.commands.registerCommand('local-model-advisor.setHuggingFaceToken', () =>
		promptAndStoreHfToken(context)
	);

	context.subscriptions.push(scanCommand, tokenCommand);
}

function handleWebviewMessage(context: vscode.ExtensionContext, message: WebviewToExtension): void {
	switch (message.type) {
		case 'rescan':
			if (AdvisorPanel.current) {
				void runScan(context, AdvisorPanel.current);
			}
			break;
		case 'openExternal':
			void vscode.env.openExternal(vscode.Uri.parse(message.url));
			break;
		case 'copy':
			void vscode.env.clipboard.writeText(message.text).then(() =>
				vscode.window.showInformationMessage('Command copied — paste it in your terminal.')
			);
			break;
	}
}

async function runScan(context: vscode.ExtensionContext, panel: AdvisorPanel): Promise<void> {
	panel.post({ type: 'scanning' });
	try {
		const hardware = await scanHardware();
		panel.post({ type: 'hardware', hardware });
		const token = await getHfToken(context);
		const { models, source } = await getRecommendations(hardware, { token });
		panel.post({ type: 'models', models, source });
	} catch (err) {
		panel.post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
	}
}

export function deactivate() {}
