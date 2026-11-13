import type { PresetId } from '../../types/corpus';

export type DefenseFlagId =
  | 'input.unicode'
  | 'input.metadata'
  | 'input.hiddenLayers'
  | 'input.failClosed'
  | 'prompt.dataMarking'
  | 'prompt.sandwich'
  | 'prompt.instructionHierarchy'
  | 'prompt.refusalExamples'
  | 'output.blockCanary'
  | 'output.systemPromptLeak'
  | 'output.safeRendering'
  | 'output.schemaValidation'
  | 'human.review'
  | 'agency.readOnly'
  | 'agency.confirmCalls';

export type DefenseGroupId = 'input' | 'prompt' | 'output' | 'human' | 'agency';

export type MasterId = 'input.guardrails' | 'output.guardrails' | 'agency.leastPrivilege';

export interface DefenseFlagDefinition {
  id: DefenseFlagId;
  label: string;
  group: DefenseGroupId;
  master?: MasterId;
  description: string;
  limitation: string;
  advanced?: boolean;
}

export interface DefenseGroupDefinition {
  id: DefenseGroupId;
  label: string;
  description: string;
  master?: MasterId;
}

export const DEFENSE_GROUPS: DefenseGroupDefinition[] = [
  {
    id: 'input',
    label: 'Input',
    description: 'What reaches the prompt after extraction.',
    master: 'input.guardrails',
  },
  {
    id: 'prompt',
    label: 'Prompt',
    description: 'How the untrusted document is framed for the model.',
  },
  {
    id: 'output',
    label: 'Output',
    description: 'What is allowed to reach the user.',
    master: 'output.guardrails',
  },
  {
    id: 'human',
    label: 'Human',
    description: 'A person reviews hidden content before inference.',
  },
  {
    id: 'agency',
    label: 'Agency',
    description: 'What simulated tools can do.',
    master: 'agency.leastPrivilege',
  },
];

export const DEFENSE_FLAGS: DefenseFlagDefinition[] = [
  {
    id: 'input.unicode',
    label: 'Normalize invisible Unicode',
    group: 'input',
    master: 'input.guardrails',
    description:
      'Removes zero-width, bidi-control, and Unicode Tag characters before the prompt is assembled.',
    limitation:
      'Does not remove visible malicious text; aggressive normalization can alter legitimate scripts.',
  },
  {
    id: 'input.metadata',
    label: 'Strip document metadata',
    group: 'input',
    master: 'input.guardrails',
    description: 'Excludes PDF Info/XMP and image EXIF/XMP from the prompt.',
    limitation: 'Metadata copied into visible text is unaffected.',
  },
  {
    id: 'input.hiddenLayers',
    label: 'Strip hidden text layers',
    group: 'input',
    master: 'input.guardrails',
    description:
      'Redacts micro-font, off-canvas, invisible render mode, and near-white hidden segments.',
    limitation:
      'Heuristic; pdf.js does not expose reliable per-glyph color, and visible malicious text is unaffected.',
  },
  {
    id: 'input.failClosed',
    label: 'Block on critical finding',
    group: 'input',
    description:
      'Blocks the run before inference when detection finds a critical finding, unless explicitly overridden.',
    limitation: 'False positives block legitimate documents and prevent the model demo.',
    advanced: true,
  },
  {
    id: 'prompt.dataMarking',
    label: 'Delimiter & data marking',
    group: 'prompt',
    description:
      'Wraps the document in a random-nonce untrusted-data block, escapes chat tokens, and labels it as passive data.',
    limitation:
      'Probabilistic. A small model may still follow the payload; it changes framing, not content.',
  },
  {
    id: 'prompt.sandwich',
    label: 'Sandwich defense',
    group: 'prompt',
    description:
      'Repeats the task and the passive-data reminder after the untrusted content.',
    limitation:
      'Mixed empirical results; adaptive payloads can target the trailing instruction and it costs tokens.',
  },
  {
    id: 'prompt.instructionHierarchy',
    label: 'Instruction hierarchy',
    group: 'prompt',
    description:
      'Hardened system prompt: document content is data, never instructions; system rules outrank user and document text.',
    limitation:
      'A system prompt is not a security boundary; paraphrased or indirect payloads can still work.',
  },
  {
    id: 'prompt.refusalExamples',
    label: 'Refusal examples',
    group: 'prompt',
    description:
      'Adds few-shot examples of ignoring embedded instructions and answering the user question.',
    limitation: 'Costs tokens and can bias or confuse a small model.',
    advanced: true,
  },
  {
    id: 'output.blockCanary',
    label: 'Block payload canary',
    group: 'output',
    master: 'output.guardrails',
    description:
      'Blocks the response when it contains the payload canary or a high-confidence payload signature.',
    limitation: 'Signature-based; paraphrased injections can pass.',
  },
  {
    id: 'output.systemPromptLeak',
    label: 'Detect system-prompt leak',
    group: 'output',
    master: 'output.guardrails',
    description:
      'Adds a random secret to the system prompt and flags it if the output repeats it.',
    limitation: 'Detects verbatim leakage only.',
  },
  {
    id: 'output.safeRendering',
    label: 'Sanitize rendered output',
    group: 'output',
    master: 'output.guardrails',
    description:
      'Strips raw HTML, remote images, and dangerous URLs when markdown rendering is enabled.',
    limitation: 'The default transcript is plain text; this is a no-op unless markdown is on.',
  },
  {
    id: 'output.schemaValidation',
    label: 'Validate structured output',
    group: 'output',
    description: 'Constrains the task to a JSON schema and rejects invalid output.',
    limitation: 'Syntax validation is not semantic safety; injection can still change field values.',
    advanced: true,
  },
  {
    id: 'human.review',
    label: 'Review hidden content before sending',
    group: 'human',
    description:
      'Pauses before inference when detection finds medium+ evidence, and shows the exact prompt that would be sent.',
    limitation: 'A tired or careless reviewer can approve a malicious send; it is a gate, not a classifier.',
  },
  {
    id: 'agency.readOnly',
    label: 'Read-only tools',
    group: 'agency',
    master: 'agency.leastPrivilege',
    description: 'Does not offer write or destructive tools; only read tools, or none.',
    limitation: 'Removes the agency demo; text-level injection still works.',
  },
  {
    id: 'agency.confirmCalls',
    label: 'Confirm every tool call',
    group: 'agency',
    master: 'agency.leastPrivilege',
    description: 'Any proposed tool call requires explicit confirmation. Execution is always simulated.',
    limitation: 'A user can approve a malicious call; human error remains.',
  },
];

export const DEFENSE_FLAG_IDS = DEFENSE_FLAGS.map((flag) => flag.id);

export type DefenseFlags = Record<DefenseFlagId, boolean>;

export const EMPTY_DEFENSE_FLAGS: DefenseFlags = Object.fromEntries(
  DEFENSE_FLAG_IDS.map((id) => [id, false]),
) as DefenseFlags;

export const ALL_DEFENSE_FLAGS_ON: DefenseFlags = Object.fromEntries(
  DEFENSE_FLAG_IDS.map((id) => [id, true]),
) as DefenseFlags;

export interface MasterDefinition {
  id: MasterId;
  label: string;
  group: DefenseGroupId;
  children: DefenseFlagId[];
}

export const MASTERS: MasterDefinition[] = [
  {
    id: 'input.guardrails',
    label: 'Input guardrails',
    group: 'input',
    children: ['input.unicode', 'input.metadata', 'input.hiddenLayers'],
  },
  {
    id: 'output.guardrails',
    label: 'Output guardrails',
    group: 'output',
    children: ['output.blockCanary', 'output.systemPromptLeak', 'output.safeRendering'],
  },
  {
    id: 'agency.leastPrivilege',
    label: 'Least-privilege tools',
    group: 'agency',
    children: ['agency.readOnly', 'agency.confirmCalls'],
  },
];

export type MasterState = 'on' | 'off' | 'mixed';

export function getMasterState(flags: DefenseFlags, master: MasterId): MasterState {
  const definition = MASTERS.find((entry) => entry.id === master);
  if (!definition) return 'off';
  const values = definition.children.map((id) => flags[id]);
  if (values.every(Boolean)) return 'on';
  if (values.every((value) => !value)) return 'off';
  return 'mixed';
}

export function setMaster(flags: DefenseFlags, master: MasterId, enabled: boolean): DefenseFlags {
  const definition = MASTERS.find((entry) => entry.id === master);
  if (!definition) return flags;
  const next = { ...flags };
  for (const id of definition.children) next[id] = enabled;
  return next;
}

export function enabledCount(flags: DefenseFlags): number {
  return DEFENSE_FLAG_IDS.filter((id) => flags[id]).length;
}

export function groupCount(
  flags: DefenseFlags,
  group: DefenseGroupId,
): { enabled: number; total: number } {
  const ids = DEFENSE_FLAGS.filter((flag) => flag.group === group).map((flag) => flag.id);
  return { enabled: ids.filter((id) => flags[id]).length, total: ids.length };
}

const PRESET_IDS: PresetId[] = [
  'unsafe',
  'naive',
  'spotlight',
  'sandwich',
  'clean',
  'recommended',
  'paranoid',
];

function flagsWith(ids: DefenseFlagId[]): DefenseFlags {
  const flags = { ...EMPTY_DEFENSE_FLAGS };
  for (const id of ids) flags[id] = true;
  return flags;
}

export const PRESET_FLAGS: Record<PresetId, DefenseFlags> = {
  unsafe: flagsWith([]),
  naive: flagsWith(['prompt.instructionHierarchy']),
  spotlight: flagsWith(['prompt.dataMarking']),
  sandwich: flagsWith(['prompt.dataMarking', 'prompt.sandwich']),
  clean: flagsWith(['input.unicode', 'input.metadata', 'input.hiddenLayers']),
  recommended: flagsWith([
    'input.unicode',
    'input.metadata',
    'input.hiddenLayers',
    'prompt.dataMarking',
    'prompt.sandwich',
    'prompt.instructionHierarchy',
    'output.blockCanary',
    'output.systemPromptLeak',
    'output.safeRendering',
    'agency.readOnly',
    'agency.confirmCalls',
  ]),
  paranoid: { ...ALL_DEFENSE_FLAGS_ON },
};

export interface PresetDefinition {
  id: PresetId;
  label: string;
  shortLabel: string;
  intent: string;
  expectedOutcome: string;
  dangerous?: boolean;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'unsafe',
    label: 'Unsafe demo',
    shortLabel: 'Unsafe',
    intent: 'Every defense off. This is the damage demo.',
    expectedOutcome: 'Injection expected to succeed.',
    dangerous: true,
  },
  {
    id: 'naive',
    label: 'Naive system prompt',
    shortLabel: 'Naive',
    intent: 'Only an instruction-hierarchy system prompt.',
    expectedOutcome: 'Injection usually still succeeds.',
  },
  {
    id: 'spotlight',
    label: 'Spotlight only',
    shortLabel: 'Spotlight',
    intent: 'Delimiter and data marking only.',
    expectedOutcome: 'Mixed; often succeeds on a small model.',
  },
  {
    id: 'sandwich',
    label: 'Sandwich only',
    shortLabel: 'Sandwich',
    intent: 'Data marking plus a trailing task reminder.',
    expectedOutcome: 'Mixed; compare with spotlight.',
  },
  {
    id: 'clean',
    label: 'Clean input only',
    shortLabel: 'Clean input',
    intent: 'Unicode, metadata, and hidden-layer hygiene only.',
    expectedOutcome: 'Hidden payloads removed; visible payloads still succeed.',
  },
  {
    id: 'recommended',
    label: 'Recommended',
    shortLabel: 'Recommended',
    intent: 'Balanced defense-in-depth without the human gate.',
    expectedOutcome: 'Injection usually blocked or ignored.',
  },
  {
    id: 'paranoid',
    label: 'Paranoid',
    shortLabel: 'Paranoid',
    intent: 'Maximum restriction, human review, fail-closed.',
    expectedOutcome: 'Highest defense rate; over-refusal expected.',
  },
];

export type PresetSelection = PresetId | 'custom';

export function derivePreset(flags: DefenseFlags): PresetSelection {
  for (const id of PRESET_IDS) {
    const presetFlags = PRESET_FLAGS[id];
    if (DEFENSE_FLAG_IDS.every((flagId) => presetFlags[flagId] === flags[flagId])) return id;
  }
  return 'custom';
}

export type DemoVariant = 'malicious' | 'benign';

export interface DemoOptions {
  /** The sample itself: malicious payload or same-layout benign twin. Not a defense. */
  variant: DemoVariant;
  multiTurn: boolean;
  toolCalling: boolean;
  renderMarkdown: boolean;
  ocr: boolean;
}

export const DEFAULT_DEMO_OPTIONS: DemoOptions = {
  variant: 'malicious',
  multiTurn: true,
  toolCalling: false,
  renderMarkdown: false,
  ocr: true,
};
