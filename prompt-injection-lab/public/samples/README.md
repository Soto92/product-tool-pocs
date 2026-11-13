# `public/samples/` — synthetic corpus (planned)

**Status:** empty until Phase 2. This README is a placeholder and a contract.

This directory will contain the reviewed, pre-generated attack corpus and its
`manifest.json`. Files are served as static assets; they are never uploaded.

## Naming

```text
01-clean-invoice.pdf
02-white-on-white.pdf
02-white-on-white.clean.pdf      # benign twin
03-off-canvas.pdf
03-off-canvas.clean.pdf
...
13-clean-notes.txt
manifest.json
```

- `NN-<slug>.<ext>` is the malicious sample.
- `NN-<slug>.clean.<ext>` is the benign twin: same layout, no payload, no malicious
  metadata, no hidden text.
- Clean controls (`01`, `12`, `13`) do not need a twin.

## Manifest

`manifest.json` is the only source the app uses to list samples. It records:

- `id`, `file`, `benignTwin`, `kind`, `title`, `vector`;
- `humanView`, `canary`, `sha256`, `sizeBytes`;
- `expectedFindings`;
- `expectedByPreset` for all seven presets;
- generator metadata (tool, seed).

See [../../docs/05-test-corpus.md](../../docs/05-test-corpus.md) for the schema and
expected outcomes.

## Rules

- **Synthetic only.** Do not add real malicious documents or real exfiltration URLs.
- **All URLs use `example.invalid`.** No request may be derived from document content.
- **Payloads are harmless.** The canonical payload asks for a spaghetti carbonara recipe
  and `PI_LAB_CANARY_7F3A`; nothing else.
- **Do not hand-edit binaries.** Regenerate them with
  [`../../tools/sample-generator/`](../../tools/sample-generator/README.md).
- **Every malicious sample has a benign twin.** The scenario switch depends on the pair.
- **Hashes are verified by tests**, not at runtime (uploads are hashed at runtime).
- Keep files small; the architecture defines size/page limits.

## Adding a sample

1. Add a generator entry with a stable ID and seed.
2. Generate both the malicious file and its benign twin.
3. Review the bytes and the human-visible rendering.
4. Add the manifest entry and expected findings/outcomes.
5. Run the corpus tests (manifest parity, hashes, no external domains).
6. Update [../../docs/05-test-corpus.md](../../docs/05-test-corpus.md).
