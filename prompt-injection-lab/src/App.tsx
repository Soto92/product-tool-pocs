import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CorpusManifest, PresetId, SampleManifestEntry } from './types/corpus';
import type { DocumentRecord } from './types/ingest';
import {
  DEFENSE_FLAGS,
  DEFENSE_GROUPS,
  MASTERS,
  PRESETS,
  type DemoOptions,
  type MasterState,
  getMasterState,
} from './features/defenses/catalog';
import {
  DEFAULT_STATE,
  applyPreset,
  defenseSummary,
  groupSummary,
  toggleFlag,
  toggleMaster,
} from './features/defenses/state';
import { ingestBytes } from './features/ingest/ingest';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function masterLabel(state: MasterState): string {
  if (state === 'on') return 'On';
  if (state === 'mixed') return 'Mixed';
  return 'Off';
}

function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky';
}) {
  const tones = {
    slate: 'border-slate-700 bg-slate-800/70 text-slate-300',
    emerald: 'border-emerald-700/70 bg-emerald-950/50 text-emerald-300',
    amber: 'border-amber-700/70 bg-amber-950/40 text-amber-300',
    rose: 'border-rose-700/70 bg-rose-950/40 text-rose-300',
    sky: 'border-sky-700/70 bg-sky-950/40 text-sky-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Switch({
  checked,
  label,
  description,
  limitation,
  onChange,
  advanced,
}: {
  checked: boolean;
  label: string;
  description: string;
  limitation: string;
  onChange: () => void;
  advanced?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      title={`${description}\n\nLimitation: ${limitation}`}
      className={`group flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition ${
        checked
          ? 'border-emerald-700/60 bg-emerald-950/30 hover:bg-emerald-950/45'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
          checked ? 'border-emerald-500 bg-emerald-500/80' : 'border-slate-600 bg-slate-700'
        }`}
        aria-hidden="true"
      >
        <span
          className={`h-3.5 w-3.5 rounded-full bg-white shadow transition ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-medium ${checked ? 'text-emerald-100' : 'text-slate-200'}`}>
            {label}
          </span>
          {advanced ? <Badge tone="slate">advanced</Badge> : null}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{description}</span>
      </span>
      <span className={`ml-auto shrink-0 text-[11px] font-semibold ${checked ? 'text-emerald-300' : 'text-slate-500'}`}>
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  );
}

function MasterSwitch({
  master,
  state,
  onChange,
}: {
  master: (typeof MASTERS)[number];
  state: MasterState;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={state === 'on' ? true : state === 'mixed' ? 'mixed' : false}
      onClick={onChange}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
        state === 'on'
          ? 'border-emerald-600/70 bg-emerald-950/50 text-emerald-300'
          : state === 'mixed'
            ? 'border-amber-600/70 bg-amber-950/40 text-amber-300'
            : 'border-slate-700 bg-slate-900 text-slate-400'
      }`}
      title={`Toggle all ${master.label} children`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          state === 'on' ? 'bg-emerald-400' : state === 'mixed' ? 'bg-amber-400' : 'bg-slate-600'
        }`}
        aria-hidden="true"
      />
      {master.label}: {masterLabel(state)}
    </button>
  );
}

export default function App() {
  const [manifest, setManifest] = useState<CorpusManifest | null>(null);
  const [manifestError, setManifestError] = useState('');
  const [state, setState] = useState(DEFAULT_STATE);
  const [selectedId, setSelectedId] = useState('02-white-on-white');
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [uploaded, setUploaded] = useState<{ name: string; record: DocumentRecord } | null>(null);
  const [ingestError, setIngestError] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('./samples/manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Manifest request failed (${response.status})`);
        return response.json() as Promise<CorpusManifest>;
      })
      .then((data) => {
        if (cancelled) return;
        setManifest(data);
        setSelectedId((current) =>
          data.samples.some((sample) => sample.id === current)
            ? current
            : data.samples.find((sample) => sample.id === '02-white-on-white')?.id ??
              data.samples[0]?.id ??
              '',
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) setManifestError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSample = useMemo(
    () => manifest?.samples.find((sample) => sample.id === selectedId),
    [manifest, selectedId],
  );

  const selectedFile =
    uploaded
      ? undefined
      : state.demo.variant === 'benign' && selectedSample?.benignTwin
        ? selectedSample.benignTwin
        : selectedSample?.file;

  useEffect(() => {
    if (!selectedFile) return;
    let cancelled = false;
    setIngesting(true);
    setIngestError('');
    fetch(`./samples/${selectedFile}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${selectedFile} (${response.status})`);
        return response.arrayBuffer();
      })
      .then((buffer) =>
        ingestBytes(new Uint8Array(buffer), {
          filename: selectedFile,
          declaredMime: undefined,
        }),
      )
      .then((record) => {
        if (!cancelled) setDocument(record);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDocument(null);
          setIngestError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setIngesting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  const summary = defenseSummary(state);
  const presetDefinition = PRESETS.find((preset) => preset.id === state.preset);
  const attackActive =
    Boolean(selectedSample) &&
    !selectedSample?.vector.includes('control') &&
    state.demo.variant === 'malicious';
  const activeDocument = uploaded?.record ?? document;

  async function loadUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setIngestError('File is larger than 10 MB. Choose a smaller document.');
      return;
    }
    setIngestError('');
    setIngesting(true);
    setUploaded(null);
    setDocument(null);
    setSelectedId('');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const record = await ingestBytes(bytes, {
        filename: file.name,
        declaredMime: file.type || undefined,
      });
      setDocument(record);
      setUploaded({ name: file.name, record });
    } catch (error: unknown) {
      setDocument(null);
      setIngestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIngesting(false);
    }
  }

  function selectSample(sample: SampleManifestEntry) {
    setUploaded(null);
    setDocument(null);
    setSelectedId(sample.id);
    if (!sample.benignTwin) {
      setState((current) => ({ ...current, demo: { ...current.demo, variant: 'malicious' } }));
    }
  }

  function updateDemo<K extends keyof DemoOptions>(key: K, value: DemoOptions[K]) {
    setState((current) => ({ ...current, demo: { ...current.demo, [key]: value } }));
  }

  function changePreset(value: string) {
    if (value === 'custom') return;
    setState((current) => applyPreset(current, value as PresetId));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-700/50 bg-emerald-950/40 text-lg">
              🧪
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight">Prompt Injection Lab</h1>
                <Badge tone="sky">LOCAL DEMO</Badge>
                <Badge tone="slate">no uploads</Badge>
              </div>
              <p className="truncate text-[11px] text-slate-500">
                Defenses are the switches. With them off, the document attack path is active.
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] text-slate-400">
              Preset
              <select
                value={state.preset}
                onChange={(event) => changePreset(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none ring-emerald-500/40 focus:ring-2"
              >
                {state.preset === 'custom' ? (
                  <option value="custom" disabled>
                    Custom
                  </option>
                ) : null}
                {PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <Badge tone={summary.dangerous ? 'rose' : summary.enabled < 8 ? 'amber' : 'emerald'}>
              Defenses {summary.enabled}/{summary.total}
            </Badge>
            <Badge tone="slate">Model: not loaded</Badge>
            <button
              type="button"
              disabled
              title="WebLLM integration arrives in the next phase."
              className="cursor-not-allowed rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-500"
            >
              Run all presets
            </button>
          </div>
        </div>

        <div
          className={`border-t px-4 py-2 ${
            summary.dangerous
              ? 'border-rose-900/60 bg-rose-950/25'
              : 'border-slate-800/80 bg-slate-900/40'
          }`}
        >
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-slate-400">Defense switches</span>
            {summary.dangerous ? (
              <span className="font-semibold text-rose-300">All defenses off — damage demo mode</span>
            ) : (
              <span className="text-slate-500">
                {presetDefinition?.intent ?? 'Custom defense combination'}
              </span>
            )}
            <span className="ml-auto text-slate-500">Demo setup / sample controls live below, outside the defense count.</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-4">
        <section aria-label="Defense switches" className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {DEFENSE_GROUPS.map((group) => {
            const groupFlags = DEFENSE_FLAGS.filter((flag) => flag.group === group.id);
            const count = groupSummary(state, group.id);
            const master = group.master ? MASTERS.find((entry) => entry.id === group.master) : undefined;
            return (
              <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-900/35 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      {group.label}
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      {count.enabled}/{count.total} on
                    </p>
                  </div>
                  {master ? (
                    <div className="ml-auto">
                      <MasterSwitch
                        master={master}
                        state={getMasterState(state.flags, master.id)}
                        onChange={() => setState((current) => toggleMaster(current, master.id))}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  {groupFlags.map((flag) => (
                    <Switch
                      key={flag.id}
                      checked={state.flags[flag.id]}
                      label={flag.label}
                      description={flag.description}
                      limitation={flag.limitation}
                      advanced={flag.advanced}
                      onChange={() => setState((current) => toggleFlag(current, flag.id))}
                    />
                  ))}
                </div>
                {group.id === 'agency' && !state.demo.toolCalling ? (
                  <p className="mt-2 text-[10px] text-amber-400/80">
                    No effect while simulated tools are off.
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="space-y-4">
            <section className="rounded-xl border border-amber-900/50 bg-amber-950/10 p-3">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Demo setup
                </h2>
                <Badge tone="amber">not defenses</Badge>
              </div>
              <p className="mb-2 text-[11px] leading-4 text-amber-100/70">
                These controls change what the lab simulates. They never count as protections.
              </p>
              <div className="mb-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">
                  Sample variant
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-amber-900/40 bg-slate-950/40 p-1">
                  <button
                    type="button"
                    onClick={() => updateDemo('variant', 'malicious')}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
                      state.demo.variant === 'malicious'
                        ? 'bg-rose-950/70 text-rose-200'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Malicious
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSample?.benignTwin}
                    onClick={() => updateDemo('variant', 'benign')}
                    title={
                      selectedSample?.benignTwin
                        ? 'Load the benign twin with the same layout and no payload.'
                        : 'This sample has no benign twin.'
                    }
                    className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      state.demo.variant === 'benign'
                        ? 'bg-emerald-950/70 text-emerald-200'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Benign twin
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {(
                  [
                    ['multiTurn', 'Multi-turn memory'],
                    ['toolCalling', 'Simulated tools'],
                    ['renderMarkdown', 'Render markdown output'],
                    ['ocr', 'Read text from images (OCR)'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-[11px] text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={state.demo[key]}
                      onChange={(event) => updateDemo(key, event.target.checked)}
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-amber-200/55">
                State is wired now. OCR, simulated tools, markdown rendering, and multi-turn
                take effect when the model runner lands.
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Local file
                </h2>
                <Badge tone="slate">stays in this tab</Badge>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,application/pdf,text/plain,image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadUpload(file);
                  event.currentTarget.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) void loadUpload(file);
                }}
                className={`w-full rounded-lg border border-dashed px-3 py-5 text-center transition ${
                  dragging
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/60'
                }`}
              >
                <span className="block text-[11px] font-medium text-slate-300">
                  Drop a file or browse
                </span>
                <span className="mt-1 block text-[10px] text-slate-500">
                  PDF, TXT, JPG, PNG, WEBP · max 10 MB · never uploaded
                </span>
              </button>
              {uploaded ? (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-sky-900/50 bg-sky-950/20 px-2 py-1.5 text-[10px] text-sky-200">
                  <span className="truncate">{uploaded.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploaded(null);
                      setSelectedId('02-white-on-white');
                    }}
                    className="ml-auto shrink-0 text-sky-400 hover:text-sky-200"
                  >
                    clear
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Sample library
                </h2>
                <Badge tone="slate">{manifest?.samples.length ?? 0}</Badge>
              </div>
              {manifestError ? (
                <p className="rounded-md border border-rose-900/60 bg-rose-950/30 p-2 text-[11px] text-rose-300">
                  {manifestError}
                </p>
              ) : null}
              <div className="max-h-[520px] space-y-1.5 overflow-auto pr-1">
                {manifest?.samples.map((sample) => {
                  const selected = sample.id === selectedId;
                  const control = sample.vector.includes('control');
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => selectSample(sample)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                        selected
                          ? 'border-sky-700/70 bg-sky-950/30'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[11px] font-medium text-slate-200">{sample.title}</span>
                        <span className="ml-auto shrink-0">
                          <Badge tone={control ? 'emerald' : 'rose'}>{control ? 'control' : sample.kind}</Badge>
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-slate-500">
                        {sample.file}
                        {sample.benignTwin ? ' · twin available' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-4">
            <article className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {uploaded ? uploaded.name : selectedSample?.title ?? 'Select a sample'}
                    </h2>
                    {selectedSample ? (
                      <Badge tone={selectedSample.vector.includes('control') ? 'emerald' : 'rose'}>
                        {selectedSample.vector.includes('control') ? 'clean control' : 'attack sample'}
                      </Badge>
                    ) : null}
                    {state.demo.variant === 'benign' && selectedSample?.benignTwin ? (
                      <Badge tone="emerald">benign twin loaded</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                    {uploaded
                      ? 'Custom document loaded locally. No upload, no sample manifest, and no detection findings yet.'
                      : selectedSample?.humanView ?? 'Load the corpus manifest to start.'}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {selectedSample?.expectedFindings.map((finding) => (
                    <Badge key={finding} tone="amber">
                      {finding}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedSample ? (
                <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
                    <div className="text-slate-500">File</div>
                    <div className="truncate font-mono text-slate-300">{uploaded?.name ?? selectedFile ?? '—'}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
                    <div className="text-slate-500">Size</div>
                    <div className="font-mono text-slate-300">
                      {activeDocument ? formatBytes(activeDocument.sizeBytes) : ingesting ? 'loading…' : '—'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
                    <div className="text-slate-500">Pages</div>
                    <div className="font-mono text-slate-300">{activeDocument?.pageCount ?? '—'}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2">
                    <div className="text-slate-500">Detected</div>
                    <div className="truncate font-mono text-slate-300">{activeDocument?.detectedMime ?? '—'}</div>
                  </div>
                </div>
              ) : null}

              {selectedSample && attackActive ? (
                <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-rose-200">Attack path active</span>
                    <Badge tone="rose">payload present</Badge>
                    <Badge tone="rose">canary {selectedSample.canary}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-rose-100/70">
                    With all defenses off, the model is expected to follow the document instruction instead of
                    answering your question. Turn on protections above to change the path.
                  </p>
                  <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md border border-rose-900/40 bg-slate-950/60 p-2 font-mono text-[10px] leading-4 text-rose-100/80">
                    {manifest?.payload ?? 'Canonical payload'}
                  </pre>
                </div>
              ) : null}

              {state.demo.variant === 'benign' && selectedSample?.benignTwin ? (
                <div className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3">
                  <div className="text-xs font-semibold text-emerald-200">Benign twin loaded</div>
                  <p className="mt-1 text-[11px] leading-5 text-emerald-100/70">
                    Same layout and file type, no payload. This is an A/B control, not a defense. The defense
                    switches above are unchanged.
                  </p>
                </div>
              ) : null}

              {ingestError ? (
                <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200">
                  {ingestError}
                </div>
              ) : null}
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Run</h2>
                <Badge tone="slate">WebLLM integration next</Badge>
                <Badge tone={summary.dangerous ? 'rose' : summary.enabled < 8 ? 'amber' : 'emerald'}>
                  {summary.dangerous
                    ? 'Vulnerable posture'
                    : summary.enabled < 8
                      ? 'Partial mitigation'
                      : 'Hardened posture'}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                This build wires the corpus, input extraction, defense catalog, and switch state. The local
                model is not loaded yet, so no verdict is claimed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500"
                >
                  Run local model
                </button>
                <button
                  type="button"
                  onClick={() => setState((current) => applyPreset(current, 'recommended'))}
                  className="rounded-md border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-950/60"
                >
                  Apply recommended defenses
                </button>
                <button
                  type="button"
                  onClick={() => setState((current) => applyPreset(current, 'unsafe'))}
                  className="rounded-md border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/50"
                >
                  Turn all defenses off
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Illustrative target output (not model output)
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-300">
{`Spaghetti carbonara
- 200 g spaghetti
- 100 g guanciale
- 2 egg yolks
- 50 g Pecorino Romano
...
${selectedSample?.canary ?? 'PI_LAB_CANARY_7F3A'}`}
                </pre>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">
                  With protections on, the expected result is a normal summary of the document and no canary.
                  The real model run arrives with the WebLLM phase.
                </p>
              </div>
            </article>
          </section>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Extracted segments
                </h2>
                <Badge tone="slate">{activeDocument?.segments.length ?? 0}</Badge>
              </div>
              {ingesting ? <p className="mt-2 text-[11px] text-slate-500">Extracting…</p> : null}
              <div className="mt-2 max-h-[440px] space-y-2 overflow-auto pr-1">
                {activeDocument?.segments.map((segment) => (
                  <div key={segment.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={segment.visibility === 'visible' ? 'sky' : 'amber'}>
                        {segment.origin}
                      </Badge>
                      {segment.page ? <Badge tone="slate">p.{segment.page}</Badge> : null}
                      <Badge tone={segment.visibility === 'visible' ? 'emerald' : 'amber'}>
                        {segment.visibility}
                      </Badge>
                    </div>
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-slate-400">
                      {segment.text}
                    </pre>
                  </div>
                ))}
                {!activeDocument && !ingesting ? (
                  <p className="text-[11px] text-slate-500">No document extracted.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Document integrity
              </h2>
              <dl className="mt-2 space-y-2 text-[11px]">
                <div>
                  <dt className="text-slate-500">SHA-256</dt>
                  <dd className="break-all font-mono text-slate-400">{activeDocument?.sha256 ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Expected findings</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {(selectedSample?.expectedFindings.length ?? 0) > 0 ? (
                      selectedSample?.expectedFindings.map((finding) => (
                        <Badge key={finding} tone="amber">
                          {finding}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-emerald-300">none in the corpus spec</span>
                    )}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] leading-4 text-slate-500">
                Detection is not wired in this build. These chips come from the corpus manifest; the extractor
                shows raw segments and metadata so the hidden content is already observable.
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Preset notes
              </h2>
              {presetDefinition ? (
                <div className="mt-2 text-[11px] leading-5 text-slate-400">
                  <div className="font-semibold text-slate-200">{presetDefinition.label}</div>
                  <p>{presetDefinition.intent}</p>
                  <p className="mt-1 text-emerald-300/80">{presetDefinition.expectedOutcome}</p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-amber-300">
                  Custom combination. The preset selector will show Custom until the flags match a named
                  preset.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-6 pt-2 text-[10px] leading-4 text-slate-600">
        Local-only demo. No uploads, no API keys, no real tool execution. No defense here is guaranteed;
        this lab is for demonstration and measurement. The illustrative output is not generated by a model in
        this build.
      </footer>
    </div>
  );
}
