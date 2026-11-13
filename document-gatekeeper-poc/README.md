# AI Document Gatekeeper — Fraud & Indirect Prompt Injection PoC

A zero-trust **Document Sanitization & Fraud Detection Gatekeeper** that inspects
uploaded documents (`PDF`, `PNG`, `JPEG`, `WEBP`, `TXT`) across 5 defense-in-depth
layers before any content is handed to a downstream LLM/VLM.

Built with **Node.js / TypeScript / Fastify** (backend) and
**React + Vite + TypeScript + Tailwind CSS** (frontend).

## Demo

https://github.com/user-attachments/assets/9b7bc2dc-f58e-4657-8d85-b8451c12d00d

## Detection Layers

| Layer | Service | Purpose |
|-------|---------|---------|
| **L1** `L1_BINARY_INTEGRITY` | `magicBytes.service.ts` | SHA-256, magic-byte MIME validation, polyglot signatures, `%PDF-` offset check |
| **L2** `L2_METADATA_INSPECTION` | `metadata.service.ts` | EXIF / XMP / PDF Info-dict inspection + image metadata stripping |
| **L3** `L3_PDF_AST_GEOMETRY` | `pdfAst.service.ts` | Micro/0-pt fonts, off-canvas text, `Tr=3` invisible text, near-white fills, `/JS` `/Launch` dictionaries |
| **L4** `L4_VISUAL_OCR_INSPECTION` | `imageOcr.service.ts` | Tesseract OCR pixel-text extraction for images |
| **L5** `L5_HEURISTIC_SEMANTIC` | `heuristic.service.ts` | Prompt-injection regex rules, Unicode Tag / zero-width smuggling, base64 blobs |

**Risk scoring:** LOW +10 · MEDIUM +25 · HIGH +50 · CRITICAL +100 (capped at 100).

**Verdict thresholds:** `0–19` ALLOW · `20–79` SANITIZE · `80–100` BLOCK.

Every ALLOW/SANITIZE result is wrapped in a randomized `<untrusted_document_data>`
"spotlight" boundary so the downstream model treats it strictly as passive data.

## Red-Team Simulator

Four synthetic samples are generated on the fly (no external files needed):

| Sample | Expected | Vector |
|--------|----------|--------|
| `clean-invoice` | ALLOW / 0 | Baseline valid invoice |
| `ghost-text-pdf` | BLOCK / 100 | 0.5pt white-on-white `### System:` instruction |
| `poisoned-metadata-pdf` | BLOCK / 100 | `<\|im_start\|>` tokens + exfil image in Author/Subject |
| `unicode-smuggling-txt` | BLOCK / 100 | Zero-width / BiDi chars + persona hijack |

### Offline test corpus

A standalone generator lives in [`../test-samples-generator`](../test-samples-generator):
`npm install && npm run generate` writes five files (clean + four attack vectors,
including PDF off-canvas text and a low-contrast EXIF/OCR image) to
`test-samples-generator/test-samples/`, ready to drag into the dashboard.

## Running

```bash
npm install                 # installs both workspaces

# terminal 1 — backend on http://localhost:3001
npm run dev --workspace=backend

# terminal 2 — frontend on http://localhost:5173
npm run dev --workspace=frontend
```

Or run both together:

```bash
npm run dev
```

Open <http://localhost:5173>, then click a Red-Team Simulator button or upload a file.

## API

- `POST /api/v1/analyze` — `multipart/form-data` (field `file`, max 15MB) → `GatekeeperReport`
- `POST /api/v1/simulate/:sampleType` — generate + analyze a sample, returns report + base64 `downloadLink`
- `GET  /api/v1/samples/:sampleType` — download a generated sample directly
