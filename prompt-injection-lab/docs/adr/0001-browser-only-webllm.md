# ADR 0001 — Browser-only app with WebLLM

- **Status:** Accepted (Phase 0)
- **Date:** 2026-11-13
- **Deciders:** Project owner
- **Supersedes:** none

## Context

The lab must demonstrate indirect prompt injection and defense toggles in a live,
believable way. The two obvious architectures are:

1. **Browser-only:** React SPA; extraction and detection in the browser; inference with
   WebLLM/WebGPU; corpus served as static files.
2. **Backend-assisted:** a server extracts documents and calls a hosted LLM API.

The demo is often run on a laptop, sometimes offline, and the audience must be able to
inspect exactly what was sent to the model. Documents can contain attacker-controlled
content, and the project should not create an upload endpoint or require API keys.

## Decision

Build a **static single-page app with no backend**.

- React 19 + Vite 8 + TypeScript 5.
- `pdfjs-dist` for PDF text, operator list, and metadata.
- `tesseract.js` for OCR, lazy-loaded.
- `exifr` for image metadata.
- `@mlc-ai/web-llm` for local inference on WebGPU.
- The default model is `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` (~1 GB, browser-cached).
- The corpus is served from `public/samples/` as static files.
- There is no API key, no upload endpoint, and no telemetry by default.

All processing happens in the tab. A Web Worker runs generation so the UI stays
responsive.

## Consequences

**Positive**

- Documents and prompts never leave the browser; the privacy story is simple.
- No server cost, no API key handling, no rate limits.
- The exact prompt can be inspected and exported.
- Deployable to any static host.
- The demo works offline after the model is cached.

**Negative**

- WebGPU is required for real inference; Safari/Firefox support varies. The app must
  offer a labeled dry-run mode instead of failing silently.
- The first load downloads ~1 GB; demo machines need a cache warm-up.
- Model quality is limited by a small local model, so some attacks may be
  model-dependent.
- OCR and PDF parsing run on the main thread unless moved to workers; performance needs
  care.
- No server-side secret or proprietary model is available.

**Neutral**

- The corpus and heuristics are self-contained; there is no shared runtime with the
  sibling `document-gatekeeper-poc`.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Hosted LLM API with a backend | Adds upload/privacy risk, API keys, cost, and network dependence; hides the prompt path from the audience |
| Local Python server + Ollama | Not shareable as a static link; installation friction; platform-specific |
| Browser-only with a remote inference proxy | Still a backend; documents would leave the tab |
| Transformers.js instead of WebLLM | Viable, but WebLLM has a mature WebGPU path and prebuilt MLC models for the chosen Qwen/Llama family |

## Follow-ups

- Verify model IDs against `prebuiltAppConfig.model_list` in Phase 3.
- Define COOP/COEP and CSP headers for the static host.
- Provide a recorded fallback for environments without WebGPU.
- Measure first-token latency and memory on the reference machine.
