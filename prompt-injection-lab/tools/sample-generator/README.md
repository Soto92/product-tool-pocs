# `tools/sample-generator/` — corpus generator (planned)

**Status:** empty until Phase 2. This README is a placeholder and a contract.

A Node 20+ CLI that deterministically regenerates the synthetic corpus in
[`../../public/samples/`](../../public/samples/README.md). It is a design-time tool; the
browser app never runs it.

## Planned dependencies

| Package | Use |
| --- | --- |
| `pdf-lib` | PDF layout, fonts, metadata, hidden text, off-canvas text |
| `sharp` | PNG/JPEG composition, low-contrast text, EXIF |
| `tsx` or `tsup` | Run/build the TypeScript CLI |
| `node:crypto` | SHA-256 for the manifest |

`tesseract.js` is not needed to generate files, but OCR output is used during review to
confirm that the low-contrast sample is readable.

## Commands (planned)

```bash
npm run samples:generate        # regenerate all files + manifest
npm run samples:verify          # manifest/file parity + SHA-256 + safety checks
npm run samples:clean           # remove generated files (except README/manifest rules)
```

## Outputs

- 13 samples: PDFs, images, and TXT.
- A benign twin for every malicious sample (`*.clean.*`).
- `manifest.json` with IDs, hashes, expected findings, and expected outcomes per preset.
- A generation log with tool versions and seeds for reproducibility.

## Determinism

- Fixed seeds for every sample.
- Fixed timestamps in PDF metadata (or a documented epoch), so hashes are stable.
- Avoid font embedding differences across platforms; pin the toolchain.
- Nonces in the app are runtime-only and never affect corpus hashes.

## Safety

- Payloads request only a recipe and the marker `PI_LAB_CANARY_7F3A`.
- Active-content keys (`/JS`, `/Launch`, `/URI`) are used only in the sample that
  demonstrates them, and are never executed by the app.
- All external-looking URLs use `example.invalid`.
- Generated binaries are reviewed before commit.

## Acceptance criteria

- Running the generator twice produces byte-identical files and manifest.
- `samples:verify` fails on a missing twin, hash mismatch, unknown URL, or manifest
  drift.
- The low-contrast image is recovered by the same OCR path the app uses.
- The white-on-white PDF is parsed by `pdfjs-dist` with the expected hidden text.
- No generated file exceeds the app's size/page limits.
