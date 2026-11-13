# ADR 0003 — Defenses are independent pipeline stages; scenario is separate

- **Status:** Accepted (Phase 0)
- **Date:** 2026-11-13
- **Deciders:** Project owner
- **Supersedes:** none

## Context

The demo needs switches that an audience can toggle live. Two failure modes are common in
security demos:

1. **Security theater:** a switch hides evidence or changes a label without changing the
   actual prompt or output.
2. **Conflated controls:** the sample-variant control is presented as a defense, so "turning
   off the attack" looks like "the defense worked".

The pipeline also needs deterministic, testable behavior: given the same document,
flags, model, and seed, the prompt assembly must be reproducible (except for nonces).

## Decision

Model the runtime as an **ordered pipeline of independent stages**, with two distinct
kinds of controls:

1. **Demo setup controls** (`demo.*`) live outside the defense switch bar and change what
   the lab simulates:
   - sample variant (malicious file vs benign twin);
   - multi-turn memory;
   - simulated tool calling;
   - markdown rendering;
   - OCR capability.
2. **Defense switches** change enforcement and are the only controls in the top bar:
   - input guardrails (Unicode, metadata, hidden layers) plus a fail-closed policy;
   - prompt defenses (instruction hierarchy, refusal examples, data marking, sandwich);
   - output guardrails (canary blocking, system-prompt leak, safe rendering, schema
     validation);
   - human review gate;
   - least-privilege tools (read-only, confirmation).

Rules:

- **Detection is always on.** Defense switches decide whether findings change the prompt
  or the output; they never hide findings from the inspector.
- **Masters are UI composition.** `input.guardrails`, `output.guardrails`, and
  `agency.leastPrivilege` toggle groups of granular flags. Persisted state and run
  snapshots store the granular flags; masters are derived (`On` / `Off` / `Mixed`).
- **Fixed precedence.** Demo setup → fail-closed → human review → sanitization →
  system prompt → data marking → sandwich → generation → output guard → verdict.
- **Immutable run records.** A run stores the granular flags, demo options, preset,
  prompt hash, model, seed, flag results, and verdict. Changing a switch marks the
  current view stale but never rewrites a past run.
- **Every flag has an observable effect.** If a flag is a no-op for a document or
  scenario, the UI says `no-op` or `skipped`; it is not silently ignored.
- **Demo setup is never a defense.** Sample variant, multi-turn, tools, markdown, and
  OCR are excluded from defense counts, defense-rate metrics, and "defenses enabled"
  summaries.
- **Honesty over reassurance.** Tooltips state limitations; the UI says "no findings",
  never "safe"; blocked output is preserved behind a disclosure.

## Consequences

**Positive**

- The prompt diff explains exactly what changed, which is the core teaching value.
- Deterministic ordering makes unit and integration tests straightforward.
- The attack A/B is honest and separable from defense efficacy.
- Adding a defense is a local change: one catalog entry, one stage, one test.
- Run snapshots support credible preset comparison.

**Negative**

- More flags than a simple on/off demo; masters and grouping are required to keep the UI
  usable.
- Some combinations are no-ops or interact (for example, safe rendering only matters when
  markdown rendering is on); the UI must explain this.
- A fixed precedence can produce surprising results if the user expects, say, human review
  before fail-closed.
- The pipeline is not a security boundary and cannot guarantee safety.

**Neutral**

- The `custom` preset is derived from deviations rather than stored as a preset.
- The evaluation harness must record both granular and derived state.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| One master "secure mode" switch | Hides which defense does what; poor teaching value |
| Toggle the attack as if it were a defense | Dishonest metrics and misleading demo |
| Separate code paths per preset | Duplication; presets would drift from the switch catalog |
| Detect only when a defense is on | Hides evidence and makes "no findings" ambiguous |
| Recompute past runs when flags change | Destroys comparability and the audit trail |

## Follow-ups

- Freeze the flag catalog IDs in Phase 1 and test-enforce the preset matrix.
- Implement the precedence table as a single function with unit tests.
- Add `flagResults` / `demoResults` telemetry in Phase 5.
- Review wording to ensure no defense is described as guaranteed.
