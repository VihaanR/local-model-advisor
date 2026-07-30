# Local Model Advisor

Find local AI models that **actually fit your machine** — from inside VS Code.

One command scans your CPU, RAM and GPU, cross-references the most-downloaded
GGUF models on Hugging Face, and ranks what your hardware can really run:

- **GPU TURBO** — fits entirely in VRAM (fastest)
- **HYBRID** — partial GPU offload
- **CPU OK** — fits in system RAM

Each recommendation ships with a one-click `ollama run hf.co/<model>` command.

![screenshot](media/screenshot.png)

## Usage

1. `Ctrl+Shift+P` → **Local Model Advisor: Scan Hardware & Recommend Models**
2. Filter by tier, open the model's Hugging Face page, or copy its Ollama command.

## Optional: Hugging Face token

The advisor works without any account. If you hit API rate limits, add a free
`read` token from <https://huggingface.co/settings/tokens> via
**Local Model Advisor: Set Hugging Face Token** — it is stored in your OS
keychain (VS Code SecretStorage), never in settings or on disk in plain text.

## Privacy

Hardware details never leave your machine. The only network call is a public
model-listing request to `huggingface.co`; when offline, a bundled catalog is
used instead.

## How sizes are estimated

Sizes assume Q4 quantization (~0.6 GB per billion parameters) plus context
headroom. Reported VRAM can be inaccurate on some Windows drivers — treat
tiers as guidance, not gospel.
