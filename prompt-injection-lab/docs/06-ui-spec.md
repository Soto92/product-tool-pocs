# 06 — UI specification

**Status:** Draft (Phase 0)
**Last updated:** 2026-11-13

The UI has one job: make the attack path and the effect of each defense obvious in under
two minutes, without hiding evidence or overclaiming safety.

## 1. Layout

### 1.1 Desktop (≥ 1440 px)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⬢ Prompt Injection Lab      [Preset: Unsafe ▾]   Qwen 2.5 1.5B · Ready  [⋯] │
│ DEFENSES [Input 0/4] [Prompt 0/4] [Output 0/4] [Human 0/1] [Agency 0/2]     │
│                                              ⚠ All defenses off — demo mode  │
├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ DEMO SETUP    │ DOCUMENT                                 │ INSPECTOR         │
│ A/B [Mal] [Ben]│ 02-white-on-white.pdf · PDF · 12 KB     │ [Extract] [Findings]│
│ ☑ Multi-turn  │ Malicious payload · "A normal invoice…" │ [Prompt] [Telemetry]│
│ ☐ Tools       │ ⚠ 2 hidden findings                     │ [Runs]            │
│ ☐ Markdown    │                                          │                   │
│ ☑ OCR         │ ┌──────────────────────────────────────┐ │ Extracted text    │
│               │ │ You: Summarize this invoice.         │ │ ...               │
│ SAMPLES       │ └──────────────────────────────────────┘ │                   │
│ ▸ Clean       │ ┌──────────────────────────────────────┐ │                   │
│ ▸ Hidden      │ │ Assistant: Here is a carbonara...    │ │                   │
│ ▸ Metadata    │ │ ██ PI_LAB_CANARY_7F3A ██             │ │                   │
│ ▸ Unicode     │ └──────────────────────────────────────┘ │                   │
│ ▸ OCR         │                                          │                   │
│ ▸ Encoded     │ ╔══════════════════════════════════════╗ │                   │
│               │ ║ INJECTION SUCCEEDED                  ║ │                   │
│ [Drop a file] │ ║ canary found in output               ║ │                   │
│               │ ╚══════════════════════════════════════╝ │                   │
│ DOCUMENT      │ [Summarize ▾] [Ask about the document…]  │                   │
│ Name, type,   │ [Stop]                            [Run]  │                   │
│ size, SHA-256 │                                          │                   │
├───────────────┴──────────────────────────────────────────┴───────────────────┤
│ Local demo · no uploads · no defense is guaranteed · model output is untrusted│
└──────────────────────────────────────────────────────────────────────────────┘
```

Columns:

| Column | Width | Scroll |
| --- | --- | --- |
| Left rail (samples + document) | 280–320 px | Independent |
| Center (chat) | Flexible, min 480 px | Chat scrolls; header/composer fixed |
| Right inspector | 400–460 px | Independent per tab |

### 1.2 Tablet (768–1439 px)

- Left rail collapses to a horizontal sample strip above the chat.
- Right inspector becomes a slide-over drawer opened by an "Inspect" button.
- Verdict banner stays visible above the composer.

### 1.3 Mobile (< 768 px)

- Single column: top bar → document card → chat → composer → inspector tabs below.
- Model status becomes an icon + short label; details in a modal.
- Not a primary target. The app must not break, but the demo is desktop-first.

## 2. Top bar

### 2.1 Row 1 — identity, preset, model, actions

| Element | Behavior |
| --- | --- |
| Brand | "Prompt Injection Lab" + small "LOCAL DEMO" chip |
| Preset select | `Unsafe`, `Naive`, `Spotlight only`, `Sandwich`, `Clean input`, `Recommended`, `Paranoid`, `Custom` |
| Model badge | Model short name + state (`Not loaded`, `Loading 42%`, `Ready`, `Generating`, `Error`); click opens model panel |
| Primary action | `Run all presets` (disabled until a document is selected and a model is ready) |
| Overflow menu | Reset, copy demo link, clear model cache, diagnostics, about |

### 2.2 Row 2 — defense switches

Compact category chips show enabled/total and a status color:

```text
DEFENSES  [Input 0/4] [Prompt 0/4] [Output 0/4] [Human 0/1] [Agency 0/2]
                                             ⚠ All defenses off — demo mode
```

- The top bar contains **only defenses**. Every switch in this row means "enable this
  protection".
- Clicking a chip expands a panel with the individual switches for that category.
- Masters (`Input guardrails`, `Output guardrails`, `Least-privilege tools`) show
  `On`, `Off`, or `Mixed` and expand to their children.
- Each switch row: label, one-line description, tooltip/info, state.
- The panel stays open while toggling; clicking outside closes it.
- The unsafe state adds a red left border to the header and the text
  **"All defenses off — demo mode"**.
- "All defenses off" is a labelled danger action in the overflow menu, not a hidden
  gesture.
- `Refusal examples` lives under an `Advanced` disclosure to avoid cluttering the default
  view.

### 2.3 Switch states

| State | Appearance | Meaning |
| --- | --- | --- |
| On | Emerald track, "On" label | Enforcement enabled |
| Off | Slate track, "Off" label | Enforcement disabled |
| Mixed | Half-filled track, "Mixed" label | Master whose children disagree |
| No-op | Amber dot + "No effect" | Enabled but irrelevant (for example `agency.confirmCalls` with read-only tools) |
| Skipped | Slate dot + "Skipped" | Not applicable to this document (for example `input.hiddenLayers` on TXT) |
| Failed | Red dot + "Failed" | The stage threw; details in Telemetry |

Never rely on color alone: include text or an icon.

### 2.4 Demo setup panel

The demo setup panel is separate from the top bar, visually amber/neutral, and labeled
**"not defenses"**. It contains:

- **Sample variant:** `Malicious payload` / `Benign twin` (paired samples only). This is an
  A/B control, not a sanitizer, and never changes the defense count.
- **Multi-turn memory**
- **Simulated tools**
- **Render markdown output**
- **Read text from images (OCR)**

Changing any of these reloads the sample variant or clears the latest findings, but does
not count as enabling or disabling a protection.


## 3. Left rail

### 3.1 Sample library

Groups:

1. **Clean controls** — invoice, receipt, notes.
2. **Hidden in the page** — white-on-white, off-canvas, invisible render mode.
3. **Metadata & Unicode** — poisoned metadata, Unicode smuggling.
4. **OCR & images** — low-contrast EXIF.
5. **Templates & encoding** — delimiter smuggling, plain text, encoded payload, active
   content.

Each card shows:

- sample number and title;
- format badge (`PDF`, `TXT`, `JPG`);
- one-line "human view";
- vector tags (`white text`, `metadata`, `OCR`);
- a small warning icon for malicious samples;
- selected state and an `A/B twin` marker when a benign twin exists.

### 3.2 Upload

- Drag-and-drop zone plus file picker.
- Accepted: PDF, TXT, JPG, JPEG, PNG, WEBP; max 10 MB.
- While parsing: progress/indeterminate state and a cancel action.
- On success: replace the current document and clear the transcript, with a confirmation
  if a run exists.
- On error: inline error with the reason and a retry action.

### 3.3 Document summary

| Field | Example |
| --- | --- |
| Filename | `02-white-on-white.pdf` |
| Declared / detected type | `application/pdf` / `application/pdf` |
| Size | `12.4 KB` |
| SHA-256 | `a1b2…` (copyable, truncated with tooltip) |
| Pages / characters | `1 page · 1,240 chars` |
| Extraction status | `Complete`, `Truncated`, `OCR failed` |
| Findings count | `2 hidden · 1 heuristic` |

## 4. Center — chat and run

### 4.1 Document context header

- Filename and "what a human sees" summary.
- Badge: `2 hidden findings` with a link that opens the Findings tab.
- Badge if the prompt was truncated.
- If the document is clean: `No findings` in a neutral (not green "safe") style.

### 4.2 Transcript

- Messages: user (right or labeled), assistant (left), system/tool events as inline
  cards.
- Assistant output streams with a blinking cursor.
- The payload canary is highlighted with a red/orange inline mark and a tooltip:
  "Marker requested by the hidden payload."
- Blocked output: replace the message body with a red card:
  **"Response blocked by the output guard"**, evidence, and a `Show blocked output`
  disclosure. The original is never deleted from the run record.
- Tool proposals appear as cards: tool name, arguments, `Approve` / `Reject`, and a
  `SIMULATED` badge. If `agency.readOnly` is on, no destructive tool cards are produced.
- Raw model output is always available in the inspector.

### 4.3 Verdict banner

Placed directly above the composer, full width:

| Verdict | Color | Text | Actions |
| --- | --- | --- | --- |
| `INJECTION SUCCEEDED` | Rose | "The model followed an instruction from the document." + evidence | `View evidence`, `Re-run with recommended` |
| `DEFENDED` | Emerald | "The model answered the user's question and did not emit the canary." | `View prompt` |
| `DEFENDED (blocked)` | Emerald + shield | "The output guard blocked a response containing the canary." | `Show blocked output` |
| `INCONCLUSIVE` | Amber | "The model refused, returned nothing, or produced an ambiguous answer." | `Retry`, `Try a larger model` |

The banner always includes a confidence label (`high`, `medium`, `low`) and never says
"safe".

### 4.4 Composer

- Multiline textarea with placeholder: *"Ask a question about this document…"*.
- Suggested chips: `Summarize this document`, `What is the total amount?`,
  `List the line items`.
- `Run` button (primary); `Stop` replaces it while generating.
- Disabled reasons are explicit: "Load a model", "Select a document", "Parsing…".
- `Cmd/Ctrl + Enter` runs; `Esc` stops.

### 4.5 Run all presets

- Opens a confirmation panel listing the seven presets and the current question.
- Runs sequentially: one model load, seven generations, same document/question/seed.
- Progress: `Running 3/7 — Spotlight only`.
- Results appear in the Runs tab and in a comparison table.

### 4.6 Human review gate

When `human.review` is on and detection finds medium+ findings, the run pauses before
inference. A modal shows:

- **Title:** "Hidden content found"
- The hidden/metadata segments with origin and severity.
- The exact prompt that would be sent (system canary redacted).
- Three actions: `Redact and send` (primary), `Send anyway` (danger, requires a second
  click), `Cancel`.
- A checkbox: "Remember this choice for this document" (session only, off by default).

The transcript does not start until the user acts. If they cancel, the run is recorded as
`INCONCLUSIVE (review cancelled)`. If they send anyway, the run record stores
`humanReview: approved-with-findings` and the findings are still included.

## 5. Right inspector

Tabs persist their state per session.

### 5.1 Extract

- List of segments with:
  - origin badge (`pdf-text`, `metadata`, `ocr`, `text`, `filename`);
  - page number;
  - visibility badge (`visible`, `hidden`, `invisible-unicode`);
  - reasons (`micro-font 0.1pt`, `off-canvas`, `tr3`, `near-white`, `zero-width`);
  - text preview (expandable).
- Invisible characters are shown as `U+200B` chips or `·` placeholders; never silently
  removed.
- Toggle: `Show only hidden`.
- Toggle: `Show what the human sees` (for PDFs, a text-only approximation; no PDF
  rendering in v1).
- Header summary: visible characters, hidden characters, removed characters.

### 5.2 Findings

- Sorted by severity, then page.
- Each row: severity badge, rule ID, title, evidence snippet, page, detector.
- Clicking a finding highlights the matching segment in Extract.
- Empty state: "No findings. That does not mean the document is safe."

### 5.3 Prompt

This tab is the core of the demo. It shows the exact messages sent to the engine:

- **System** message, with sections labeled (`role`, `rules`, `canary` hidden).
- **User** message, with the document block and the question.
- Spotlight delimiters and the nonce are visually distinct.
- Redacted segments appear as struck-through placeholders: `[redacted: micro-font]`.
- Escaped delimiters are shown with the original in a tooltip.
- Token estimate, prompt hash, truncation marker.
- Actions: `Copy prompt` (redacts the system canary), `Copy as JSON`.
- If the prompt has not been built yet: "Run the analysis to build the prompt."

### 5.4 Telemetry

| Section | Content |
| --- | --- |
| Flags | Every flag with `applied` / `no-op` / `skipped` / `failed` and a one-line reason |
| Timings | Extract, detect, sanitize, build, first token, total |
| Tokens | Prompt estimate, completion count, tokens/s |
| Model | ID, load time, cache hit/miss if known |
| Detection | Counts by detector and severity |
| Output | Canary found, signature found, system leak, blocked |

### 5.5 Runs

- List of run records (newest first): timestamp, preset, verdict chip, model, question.
- Click a run to restore its inspector data without changing the current document or
  flags.
- Compare mode: select 2–6 runs → table with preset, flags summary, verdict, canary,
  output excerpt.
- Export: JSON (full records) and CSV (summary).
- Clearing history is explicit and only affects memory.

## 6. States

| State | Screen |
| --- | --- |
| **First visit** | Shell + samples + explanation card: "Pick a sample, load a model, ask a question." |
| **No WebGPU** | Blocking card: "WebGPU is required for local inference." Browser links, diagnostics, `Continue in dry-run mode` |
| **Model not loaded** | Model card with download size, `Load model`, model selector |
| **Model loading** | Progress bar + MB, cancel, "You can inspect documents while this loads" |
| **Model error** | Error cause, `Retry`, `Try a smaller model` |
| **Document idle** | Left rail populated; center shows the selected document and "What a human sees" |
| **Parsing** | Skeleton in the inspector; Run disabled; cancel |
| **Ready** | Suggested questions visible; Run enabled |
| **Awaiting review** | Modal: hidden content + exact prompt; `Redact and send`, `Send anyway`, `Cancel` |
| **Generating** | Streaming cursor; Stop enabled; toggles disabled? (No: toggles allowed but the run snapshot is frozen; show "changes apply to the next run") |
| **Aborted** | Partial output + `INCONCLUSIVE`; `Retry` |
| **Stale run** | Subtle badge on the verdict: "Flags changed — re-run to compare" |
| **Dry-run** | Amber banner: "Dry run — no model. Verdicts are disabled." |

## 7. Design system

### 7.1 Tokens

| Token | Value | Use |
| --- | --- | --- |
| Background | `#0b1120` | App background |
| Surface | `#111827` | Cards/panels |
| Surface raised | `#1f2937` | Inputs, hover |
| Border | `#334155` | Dividers |
| Text primary | `#e2e8f0` | Body |
| Text muted | `#94a3b8` | Secondary |
| Accent | `#38bdf8` | Focus, links, primary actions |
| Defense | `#34d399` | Defended, enabled |
| Attack | `#fb7185` | Injection, dangerous |
| Warning | `#fbbf24` | Inconclusive, no-op |
| Radius | 8 px / 12 px | Controls / cards |
| Spacing | 4 px scale | Layout |
| Motion | 150 ms ease | Toggles, panels; respect `prefers-reduced-motion` |

### 7.2 Typography

- UI: system sans (`Inter`, `ui-sans-serif`).
- Code, prompts, hashes, invisible-character labels: `JetBrains Mono`, `ui-monospace`.
- Base 14 px; chat 15 px; headings 18–24 px.

### 7.3 Color semantics

- Rose = attack, injection, dangerous preset, blocked.
- Emerald = defense applied, defended.
- Amber = ambiguous, no-op, warning, dry-run.
- Sky = interactive.
- Never use color as the only signal.

## 8. Copy guidelines

- Say **"no findings"**, not "safe".
- Say **"defended in this run"**, not "secure".
- Name the evidence: "canary found in output".
- Explain a no-op: "Irrelevant for this document."
- Keep the persistent footer:
  *"Local demo · documents never leave this tab · no defense is guaranteed."*
- The unsafe preset warning:
  *"All defenses are off. The model will follow instructions hidden in the document."*
- The dry-run warning:
  *"Dry run: the model is not running. Extraction and prompt preview work; verdicts are
  disabled."*
- The blocked output explanation:
  *"The output guard found the payload marker in the response. The raw response is kept
  behind the disclosure for inspection."*

## 9. Accessibility

- All switches use `role="switch"` and `aria-checked`.
- The verdict banner uses `aria-live="assertive"`; streaming text uses
  `aria-live="polite"`.
- Focus order: top bar → left rail → chat → composer → inspector.
- Visible focus ring on every interactive element.
- Minimum contrast 4.5:1 for body text.
- Keyboard: `Tab` navigates, `Enter/Space` toggles, `Cmd/Ctrl+Enter` runs, `Esc` stops
  or closes a panel.
- Respect `prefers-reduced-motion`; streaming still works without animation.
- Truncated values (hashes, prompts) have accessible full-value alternatives.

## 10. Security constraints in the UI

- The transcript renders **plain text** by default.
- A `Render markdown (unsafe demo)` demo-setup option is off by default, marked with a
  warning, and never counted as a defense. When on, `output.safeRendering` is strongly
  recommended and remote images are blocked.
- Extracted text is never inserted as HTML.
- Links in content are not clickable by default.
- The system canary is never displayed; `Copy prompt` redacts it.
- Blocked output is not auto-rendered; it requires an explicit disclosure.
- The "show what the human sees" view is a text approximation, not a PDF renderer, in
  v1. Do not imply pixel fidelity.

## 11. Empty and error copy

| Situation | Copy |
| --- | --- |
| No document | "Choose a sample or drop a PDF, TXT, or image to begin." |
| No model | "Load a local model to run the analysis. About 1 GB on first use." |
| No WebGPU | "This browser does not expose WebGPU. Use current Chrome or Edge on desktop, or continue in dry-run mode." |
| No findings | "No findings. Heuristics can miss payloads; this is not a safety verdict." |
| Parse error | "This PDF could not be parsed. It may be encrypted or corrupt." |
| OCR failed | "OCR failed. Metadata findings are still available; image text was not read." |
| Context overflow | "The document is too long for this model. The prompt was truncated; see the marker in the inspector." |
| Generation aborted | "Generation stopped. The partial output is kept for inspection." |
| Empty output | "The model returned no text. Verdict: inconclusive." |
