# Documentation index

This is the design package for **Prompt Injection Lab**. Read in order if you are new
to the project; use the role-based paths if you are here for a specific reason.

## Reading order

| # | Document | What it answers |
| --- | --- | --- |
| 01 | [Product spec](01-product-spec.md) | Why does this exist, who is it for, what is in scope? |
| 02 | [Architecture](02-architecture.md) | How is it built, where does data flow, what are the contracts? |
| 03 | [Features and toggles](03-features-and-toggles.md) | What does each switch do, and how do presets combine them? |
| 04 | [Threat model](04-threat-model.md) | What are we defending against, and what remains unsafe? |
| 05 | [Test corpus](05-test-corpus.md) | Which documents and payloads drive the demo? |
| 06 | [UI spec](06-ui-spec.md) | What does the screen look like and how does it behave? |
| 07 | [Testing and evaluation](07-testing-and-evaluation.md) | How do we know a change helped or hurt? |
| 08 | [Roadmap](08-roadmap.md) | In what order do we build it, and when is a phase done? |

## By role

- **Reviewer / stakeholder:** 01 → 03 → 06 → 08.
- **Frontend engineer:** 02 → 03 → 06 → 07.
- **Security reviewer:** 04 → 03 → 05 → 07.
- **Demo operator:** [README](../README.md) → 03 (presets) → 05 (samples) → 06 (screens).

## Decisions

Architecture decisions live in [`adr/`](adr/):

| ADR | Decision |
| --- | --- |
| [0001](adr/0001-browser-only-webllm.md) | Browser-only app with WebLLM; no backend |
| [0002](adr/0002-static-synthetic-corpus.md) | Pre-generated synthetic corpus committed to the repo |
| [0003](adr/0003-defense-flags-as-pipeline.md) | Defenses are independent pipeline stages exposed as flags |

## Conventions

- **Language:** English for UI, docs, code, and comments.
- **Status labels:** `Draft`, `Accepted`, `Superseded`. All documents here are
  `Draft` until Phase 0 review closes.
- **Normative words:** MUST, SHOULD, MAY follow RFC 2119.
- **Placeholders:** anything marked `TBD` is intentionally undecided and must be
  resolved before the phase that needs it.
- **No code in Phase 0:** code fences in these docs are contracts and sketches, not
  implementation. The app starts in Phase 1.

## Glossary

| Term | Meaning |
| --- | --- |
| **Indirect prompt injection** | An attacker places instructions in content that a system later feeds to an LLM (a document, email, web page), rather than typing them into the chat. |
| **Payload** | The hidden instruction embedded in a sample document. |
| **Canary** | A unique marker string the payload asks the model to print. Its presence in the output is strong evidence that the injection worked. |
| **Defense switch** | A named pipeline stage that can be enabled or disabled from the top bar for demonstration. |
| **Scenario switch** | A demo control that changes the attack surface (for example, the attack payload, multi-turn memory, simulated tools). It is never counted as a defense. |
| **Preset** | A named combination of defense flags (`unsafe`, `naive`, `spotlight`, `sandwich`, `clean`, `recommended`, `paranoid`). |
| **Spotlighting / data marking** | Wrapping untrusted content in explicit delimiters, escaping delimiter tokens, and instructing the model to treat it as passive data, not instructions. |
| **Sandwich defense** | Repeating the legitimate task and the passive-data reminder *after* the untrusted content, so the last instruction the model reads is the trusted one. |
| **Human review gate** | A pre-inference pause that shows detected hidden content and requires the user to approve, redact, or cancel. |
| **Benign twin** | A copy of a malicious sample with the same layout but no payload, used for the attack on/off A/B comparison. |
| **ASR** | Attack success rate: the share of runs where the model follows the injected instruction. |
| **Run record** | Immutable snapshot of one execution: document, flags, final prompt, model output, verdict, timings. |
| **Verdict** | `INJECTION SUCCEEDED`, `DEFENDED`, or `INCONCLUSIVE`. |
