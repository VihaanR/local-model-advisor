import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Local Model Advisor', () => {
	test('contributes both commands', async () => {
		// Commands declared in package.json's contributes.commands are only
		// registered once the extension activates (VS Code does not do this
		// eagerly for a test host), so activate explicitly before checking.
		const extension = vscode.extensions.getExtension('vihaan-raut.local-model-advisor');
		await extension?.activate();

		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('local-model-advisor.scanHardware'));
		assert.ok(commands.includes('local-model-advisor.setHuggingFaceToken'));
	});
});
