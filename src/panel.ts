import * as vscode from 'vscode';
import type { ExtensionToWebview, WebviewToExtension } from './models/types';

export class AdvisorPanel {
	public static current: AdvisorPanel | undefined;

	private disposed = false;
	private lastMessage: ExtensionToWebview | undefined;
	private scanGeneration = 0;

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		onMessage: (m: WebviewToExtension) => void
	) {
		this.panel.webview.html = this.getHtml(this.panel.webview, extensionUri);
		this.panel.webview.onDidReceiveMessage((m: WebviewToExtension) => onMessage(m));
		this.panel.onDidDispose(() => {
			this.disposed = true;
			AdvisorPanel.current = undefined;
		});
		this.panel.onDidChangeViewState((e) => {
			if (e.webviewPanel.visible && this.lastMessage) {
				this.post(this.lastMessage);
			}
		});
	}

	static show(extensionUri: vscode.Uri, onMessage: (m: WebviewToExtension) => void): AdvisorPanel {
		if (AdvisorPanel.current) {
			AdvisorPanel.current.panel.reveal();
			return AdvisorPanel.current;
		}
		const panel = vscode.window.createWebviewPanel(
			'localModelAdvisor',
			'Local Model Advisor',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
			}
		);
		AdvisorPanel.current = new AdvisorPanel(panel, extensionUri, onMessage);
		return AdvisorPanel.current;
	}

	post(message: ExtensionToWebview): void {
		if (this.disposed) {
			return;
		}
		this.lastMessage = message;
		void this.panel.webview.postMessage(message);
	}

	/** Starts a new scan generation; callers must check `isCurrentScan` before posting stale results. */
	beginScan(): number {
		return ++this.scanGeneration;
	}

	isCurrentScan(generation: number): boolean {
		return generation === this.scanGeneration;
	}

	private getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'styles.css'));
		const nonce = getNonce();
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${styleUri}">
	<title>Local Model Advisor</title>
</head>
<body>
	<div id="app"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
