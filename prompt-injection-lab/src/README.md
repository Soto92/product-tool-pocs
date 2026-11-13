# `src/` — application source (planned)

**Status:** empty until Phase 1. This README is a placeholder and a contract.

The app is a React 19 + Vite 8 + TypeScript 5 single-page application. There is no
backend and no API key. See [../docs/02-architecture.md](../docs/02-architecture.md) for
the full design.

## Planned tree

```text
src/
├── main.tsx
├── App.tsx
├── app/
│   ├── routes.ts
│   └── providers.tsx
├── components/              # presentational components
│   ├── TopBar/
│   ├── ScenarioSwitches/
│   ├── DefenseGroups/
│   ├── SampleRail/
│   ├── DocumentPanel/
│   ├── Chat/
│   ├── VerdictBanner/
│   ├── HumanReviewModal/
│   └── Inspector/
├── features/
│   ├── ingest/              # PDF, TXT, image extraction
│   ├── detect/              # Unicode, geometry, metadata, heuristics
│   ├── prompt/              # system prompts, data marking, sandwich
│   ├── inference/           # WebLLM engine, worker, mock
│   ├── evaluate/            # canary, output guard, verdict, run records
│   └── review/              # fail-closed and human review gates
├── lib/                     # pure utilities
├── state/                   # flag store, persistence, URL state
├── styles/
└── types/                   # domain contracts
```

## Conventions

- **English only** in UI strings, comments, and identifiers.
- **Flags are data, not booleans scattered in components.** The catalog in
  [`docs/03-features-and-toggles.md`](../docs/03-features-and-toggles.md) is the source of
  truth; a typed object drives the UI, the pipeline, and tests.
- **Scenario switches are not defenses.** Do not include `scenario.*` in defense counts
  or metrics.
- **Pure functions first.** Extraction, detection transforms, prompt assembly, canary
  detection, and verdict computation must be testable without a browser.
- **No HTML injection.** Model output and extracted text render as text by default.
- **No network derived from document content.** No remote images, links, or URL fetches.
- **Immutable run records.** A flag change never mutates a past run.

## Phase 1 checklist

- [ ] Vite + React + TypeScript + Tailwind scaffold
- [ ] Typed flag catalog and preset matrix
- [ ] Three-column shell and top bar (scenario + defense rows)
- [ ] URL and `localStorage` persistence
- [ ] Mock engine with deterministic responses
- [ ] Verdict banner, stale badge, blocked-output disclosure
- [ ] Unit tests for flags/presets; Playwright shell smoke

Do not add feature code before the Phase 0 review closes.
