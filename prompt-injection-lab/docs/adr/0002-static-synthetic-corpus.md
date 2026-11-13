# ADR 0002 — Static, synthetic, checked-in corpus

- **Status:** Accepted (Phase 0)
- **Date:** 2026-11-13
- **Deciders:** Project owner
- **Supersedes:** none

## Context

The lab needs documents that reliably demonstrate specific injection vectors:

- white-on-white and micro-font text;
- off-canvas text and invisible render mode;
- poisoned metadata;
- Unicode smuggling;
- OCR-only low-contrast text;
- delimiter smuggling and encoded payloads;
- clean controls.

Generating these at runtime would be complex, non-deterministic, and would make tests
depend on the generator. Downloading real malicious documents is unsafe, unreviewable,
and a distribution risk.

## Decision

Ship a **small, synthetic, pre-generated corpus** checked into the repository.

- Every malicious sample isolates one primary vector.
- Every malicious sample has a **benign twin** with the same layout but no payload, used
  by the demo setup's sample-variant A/B control.
- A clean control exists in each format (PDF, image, TXT).
- Payloads only ask for a harmless spaghetti carbonara recipe and the marker
  `PI_LAB_CANARY_7F3A`.
- All URLs use `example.invalid`; there is no real exfiltration endpoint.
- `manifest.json` records ID, filename, benign twin, kind, vector, expected findings,
  canary, SHA-256, size, and expected outcomes per preset.
- A Node CLI in `tools/sample-generator/` (`pdf-lib` + `sharp`) regenerates the corpus
  deterministically from a recorded seed.
- Tests verify that every file is in the manifest and that hashes match at build time.

## Consequences

**Positive**

- Deterministic demos and tests; no runtime generation.
- Every file is reviewable in a pull request.
- Safe to host publicly; no real payloads, no real URLs.
- Benign twins enable a clean A/B comparison of the attack.
- The generator documents exactly how each vector is constructed.

**Negative**

- The corpus is fixed; adding a vector means regenerating and reviewing files.
- Binary files increase repository size (small, but non-zero).
- A synthetic payload may be less convincing than a real-world document.
- The generator must handle PDF font/encoding limitations and OCR tuning.

**Neutral**

- The corpus is intentionally small (13 samples). It is a teaching set, not a benchmark.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Generate documents at runtime in the browser | Hard to make deterministic; mixes generator bugs with detector bugs |
| Download public malicious samples | Unreviewable, potentially harmful, licensing/privacy issues |
| Use only text fixtures | Does not demonstrate PDF/OCR/metadata vectors, which are the point |
| One malicious file per vector without twins | Weakens A/B demos and makes layout effects confound the payload effect |

## Follow-ups

- Freeze the manifest schema in Phase 2.
- Add a CI check for manifest/file parity and SHA-256.
- Document payload tuning if the default model resists the canonical sample.
- Keep every sample under the size/page limits defined in the architecture.
