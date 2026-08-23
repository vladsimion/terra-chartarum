/**
 * Corpus Chartarum Daciae programme index (KAN-370)
 *
 * Seven trenches, four workstreams and the datasets they share, compiled by
 * `scripts/dacia/build.py` from the governance tables into
 * `src/data/dacia/generated/programme.json`.
 *
 * The index is generated rather than written because a hand-maintained one is a
 * second copy of the programme's state, and the copy is the one that goes
 * stale: a gate moving from pending to partial, a debt opening, a trench
 * gaining corpus records should all change this page on the next `make dacia`
 * and not before somebody remembers to edit it.
 */
import programme from '../data/dacia/generated/programme.json';
import type { RoomSlug } from '../data/rooms';

export interface ProgrammeGate {
  gate: string;
  status: 'pending' | 'partial' | 'passed' | 'waived';
  note: string;
}

export interface ProgrammeEntry {
  id: string;
  kind: 'programme' | 'trench' | 'workstream';
  label: string;
  epicKey: string;
  campaign: string;
  room: RoomSlug;
  /** The essay this trench resolves to, where one has been published. */
  essaySlug: string;
  state: 'live' | 'planned' | 'reserved';
  note: string;
  gates: ProgrammeGate[];
  gatesPassed: number;
  openDebts: number;
  /** Records this trench has actually migrated into the shared corpus. */
  corpusRecords: number;
}

export interface SharedDataset {
  id: string;
  label: string;
  kind: 'corpus' | 'atlas_layer';
  detail: string;
  href: string;
}

const ENTRIES = programme.entries as ProgrammeEntry[];

export function getProgrammeEntries(): ProgrammeEntry[] {
  return ENTRIES;
}

/** The seven trenches, in id order: Trench A through Trench G. */
export function getTrenches(): ProgrammeEntry[] {
  return ENTRIES.filter((entry) => entry.kind === 'trench');
}

/** The workstreams that serve every trench rather than belonging to one. */
export function getWorkstreams(): ProgrammeEntry[] {
  return ENTRIES.filter((entry) => entry.kind === 'workstream');
}

export function getSharedDatasets(): SharedDataset[] {
  return programme.sharedDatasets as SharedDataset[];
}

export function getOpenDebtCount(): number {
  return programme.openDebts as number;
}

/**
 * Which trenches demonstrably read the shared corpus rather than keeping their
 * own copy. Counted from the migration inventory, so a trench appears here by
 * having records in the corpus and not by being described as using it.
 */
export function getCorpusConsumers(): ProgrammeEntry[] {
  return getTrenches().filter((entry) => entry.corpusRecords > 0);
}

/** A trench's readiness in one phrase, for a status column that fits. */
export function describeState(entry: ProgrammeEntry): string {
  if (entry.state === 'live' && entry.essaySlug) return 'Published';
  if (entry.gatesPassed > 0) return 'In excavation';
  if (entry.openDebts > 0) return 'Research open';
  return 'Not begun';
}
