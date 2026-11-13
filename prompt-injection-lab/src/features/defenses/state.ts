import type { PresetId } from '../../types/corpus';
import {
  DEFAULT_DEMO_OPTIONS,
  DEFENSE_FLAG_IDS,
  PRESET_FLAGS,
  type DefenseFlagId,
  type DefenseFlags,
  type DemoOptions,
  type MasterId,
  type PresetSelection,
  derivePreset,
  enabledCount,
  getMasterState,
  groupCount,
  setMaster,
} from './catalog';

export const DEFAULT_PRESET: PresetId = 'unsafe';

export interface LabState {
  preset: PresetSelection;
  flags: DefenseFlags;
  demo: DemoOptions;
}

export const DEFAULT_STATE: LabState = {
  preset: DEFAULT_PRESET,
  flags: { ...PRESET_FLAGS[DEFAULT_PRESET] },
  demo: { ...DEFAULT_DEMO_OPTIONS },
};

export function applyPreset(state: LabState, preset: PresetId): LabState {
  return { ...state, preset, flags: { ...PRESET_FLAGS[preset] } };
}

export function toggleFlag(state: LabState, id: DefenseFlagId): LabState {
  const flags = { ...state.flags, [id]: !state.flags[id] };
  return { ...state, flags, preset: derivePreset(flags) };
}

export function toggleMaster(state: LabState, master: MasterId): LabState {
  const enabled = getMasterState(state.flags, master) !== 'on';
  const flags = setMaster(state.flags, master, enabled);
  return { ...state, flags, preset: derivePreset(flags) };
}

export function defenseSummary(state: LabState): {
  enabled: number;
  total: number;
  dangerous: boolean;
} {
  const enabled = enabledCount(state.flags);
  return {
    enabled,
    total: DEFENSE_FLAG_IDS.length,
    dangerous: enabled === 0,
  };
}

export function groupSummary(state: LabState, group: 'input' | 'prompt' | 'output' | 'human' | 'agency') {
  return groupCount(state.flags, group);
}

