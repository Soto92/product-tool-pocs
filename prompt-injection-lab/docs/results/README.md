# `docs/results/` — evaluation reports (planned)

**Status:** empty until Phase 6. This README is a placeholder.

Each report records a real evaluation run of the lab: model, hardware, browser, corpus
version, seeds, presets, and measured outcomes. Reports are evidence, not marketing.

## Naming

```text
YYYY-MM-DD-<model-slug>.md
YYYY-MM-DD-<model-slug>.json
YYYY-MM-DD-<model-slug>.csv
```

Example: `2026-11-20-qwen2.5-1.5b-instruct-q4f16_1-mlc.md`.

## Required metadata

- Date, browser version, OS, GPU/VRAM.
- WebLLM version, model ID, quantization.
- Corpus manifest hash/version.
- Seeds and repeat count.
- Question set.
- Payload variant.

## Report template

```markdown
# Evaluation — <model ID>

- Browser:
- OS / GPU:
- WebLLM:
- Corpus:
- Seeds:
- Payload variant:

## Summary

| Preset | ASR (malicious) | Defense rate | Clean FPR | Over-refusal |
| --- | --- | --- | --- | --- |

## Per-sample notes

## Observations

## Changes since last run

## Limitations
```

## Rules

- **Never fabricate results.** Placeholder numbers in the docs are illustrative and
  must not be copied into a report.
- Report `INCONCLUSIVE` separately; it is not a defense success.
- Report clean false positives and over-refusal alongside defense rate.
- Compare presets only within the same model and hardware.
- Keep raw JSON/CSV next to the report when possible.
- Do not include document content, prompts with secrets, or personal data.

See [../07-testing-and-evaluation.md](../07-testing-and-evaluation.md) for metrics and
method.
