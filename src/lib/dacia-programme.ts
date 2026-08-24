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
import { getCartographerById } from './cartographers';
import { getMapById } from './corpus';
import { atlasDeepLink } from './atlas-share';
import { CND_ATLAS_LAYER, getTrenchAStelae } from './trench-a';

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

export const RELATIONSHIP_KINDS = [
  'period',
  'source',
  'attestation',
  'place',
  'map_object',
  'cartographer',
  'atlas_layer',
  'corpus_record',
  'related_trench',
  'stratum',
] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

export interface RelationshipNode {
  kind: RelationshipKind;
  label: string;
  href: string;
  identifier?: string;
}

export interface ProgrammeRelationshipPath {
  id: string;
  title: string;
  reviewState: string;
  nodes: RelationshipNode[];
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
 * Cross-registry paths that can be demonstrated from committed identifiers.
 *
 * Only a migrated Trench A source whose canonical collection object exists is
 * eligible. That makes the sparse result honest: planned trenches do not gain
 * relationships merely because the programme expects them to exist later.
 */
export function getProgrammeRelationshipPaths(): ProgrammeRelationshipPath[] {
  return getTrenchAStelae().flatMap((stela) => {
    const map = getMapById(stela.stela);
    const sample = stela.sampleAttestation;
    if (!map || map.essaySlug !== 'dacia' || !sample || stela.yearFrom === null) return [];

    const cartographer = map.cartographerId ? getCartographerById(map.cartographerId) : undefined;
    if (!cartographer) return [];

    const atlasHref = atlasDeepLink({
      layers: [CND_ATLAS_LAYER],
      feature: sample.attestationId,
      year: stela.yearFrom,
    });
    const stratumHref = `/essays/dacia/#stratum-${stela.stela}`;

    return [
      {
        id: `${stela.sourceId}:${sample.attestationId}`,
        title: `${stela.shortTitle} to ${sample.placeName}`,
        reviewState: sample.reviewState,
        nodes: [
          { kind: 'period', label: stela.dateLabel, href: atlasHref },
          {
            kind: 'source',
            label: stela.title,
            identifier: stela.sourceId,
            href: stratumHref,
          },
          {
            kind: 'attestation',
            label: `${sample.name} (${sample.attestationClass})`,
            identifier: sample.attestationId,
            href: atlasHref,
          },
          {
            kind: 'place',
            label: sample.placeName,
            identifier: sample.placeId,
            href: atlasHref,
          },
          {
            kind: 'map_object',
            label: map.title,
            identifier: map.id,
            href: `/collection/${map.id}/`,
          },
          {
            kind: 'cartographer',
            label: cartographer.name,
            identifier: cartographer.id,
            href: `/cartographers/${cartographer.id}/`,
          },
          {
            kind: 'atlas_layer',
            label: 'CND research attestations',
            identifier: CND_ATLAS_LAYER,
            href: `/atlas/layers/${CND_ATLAS_LAYER}/`,
          },
          {
            kind: 'corpus_record',
            label: sample.attestationId,
            identifier: sample.attestationId,
            href: atlasHref,
          },
          {
            kind: 'related_trench',
            label: 'Terra Sigillata · Lapidarivm Dacicvm',
            identifier: 'ccd-a',
            href: '#trench-ccd-a',
          },
          {
            kind: 'stratum',
            label: `Stratum ${stela.shortTitle}`,
            identifier: stela.stela,
            href: stratumHref,
          },
        ],
      },
    ];
  });
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
