import type { ExtensionToWebview } from '../models/types';

const app = document.getElementById('app') as HTMLElement;
app.textContent = 'BOOTING…';

window.addEventListener('message', (event: MessageEvent<ExtensionToWebview>) => {
	app.textContent = `received: ${event.data.type}`;
});
