import * as vscode from 'vscode';
import si from 'systeminformation';
import { fetchRecommendedModels } from './fetchModels';

export function activate(context: vscode.ExtensionContext) {
	console.log('Local Model Advisor Activated');

	const output = vscode.window.createOutputChannel('Local Model Advisor');

	const disposable = vscode.commands.registerCommand(
		'local-model-advisor.scanHardware',
		async () => {
			output.clear();
			output.show(true);
			output.appendLine('Scanning hardware...');

			try {
				const [cpu, mem, graphics] = await Promise.all([
					si.cpu(),
					si.mem(),
					si.graphics(),
				]);

				const ramGB = mem.total / 1024 / 1024 / 1024;
				const gpu = graphics.controllers[0]?.model ?? 'None detected';

				output.appendLine(`CPU : ${cpu.manufacturer} ${cpu.brand}`);
				output.appendLine(`RAM : ${ramGB.toFixed(1)} GB`);
				output.appendLine(`GPU : ${gpu}`);
				output.appendLine('');
				output.appendLine('Fetching recommended models from HuggingFace...');

				const models = await fetchRecommendedModels(ramGB);

				if (models.length === 0) {
					output.appendLine('No compatible models found for your hardware.');
					return;
				}

				output.appendLine(`\nTop ${models.length} models that fit your ${ramGB.toFixed(1)} GB RAM:\n`);
				output.appendLine('Rank  Model                          Size    Min RAM  Downloads');
				output.appendLine('─'.repeat(70));

				models.forEach((m, i) => {
					const rank = String(i + 1).padEnd(6);
					const name = m.name.slice(0, 30).padEnd(31);
					const size = `${m.estimatedSizeGB} GB`.padEnd(8);
					const ram = `${m.minRamGB} GB`.padEnd(9);
					const dl = m.downloads.toLocaleString();
					output.appendLine(`${rank}${name}${size}${ram}${dl}`);
				});

				output.appendLine('');
				output.appendLine('Full model pages: each listed on https://huggingface.co/<modelId>');

			} catch (err) {
				output.appendLine(`Error: ${err}`);
				vscode.window.showErrorMessage(`Local Model Advisor: ${err}`);
			}
		}
	);

	context.subscriptions.push(disposable, output);
}

export function deactivate() {}
