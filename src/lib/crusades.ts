/**
 * Crusades pilot: the Road and the Sea (KAN-386 to KAN-389)
 *
 * Two bounded proofs, and one distinction each that the software has to keep.
 *
 * **Road.** Matthew Paris's itinerary is a strip diagram: a vertical sequence of
 * stages with day-marks between them, and no projection of any kind. A stage
 * therefore has no position. `modernReference` is the coordinate of the *place*
 * the stage names, and it is called that so nothing downstream can mistake it
 * for something the manuscript supplies. Comparing the sequence with the
 * positions is the proof; merging them would answer the question it asks.
 *
 * **Sea.** Six states that a single route line would destroy. What the crusade
 * contracted for, what it was diverted to, where it actually went, what it
 * attacked, what a treaty assigned it, and what it eventually held are six
 * different kinds of claim. The Partitio Romaniae divided an empire among people
 * who held very little of it, and drawing the assignment and the occupation the
 * same way republishes the document's wishful thinking as geography.
 */
import pilot from '../data/crusades/generated/pilot.json';

/** A stage of the drawn road. Note the absence of a `lon`/`lat` pair. */
export interface ItineraryStage {
  id: string;
  sequence: number;
  placeId: string;
  /** The name as the diagram gives it. */
  manuscriptLabel: string;
  modernName: string;
  folio: string;
  /** Day-marks the diagram draws before this stage. The manuscript's own claim. */
  depictedDays: number | null;
  mode: string;
  variantNote: string;
  evidenceClass: string;
  confidence: string;
  reviewState: string;
  sourceId: string;
  sourceLocator: string;
  notes: string;
  /** The place's modern coordinate. Reference context, never a source position. */
  modernReference: [number, number];
  geometryProvenance: string;
}

export const FOURTH_CRUSADE_STATES = [
  'intended_destination',
  'negotiated_diversion',
  'travelled_route',
  'attack',
  'partition_claim',
  'durable_control',
] as const;
export type FourthCrusadeStateKind = (typeof FOURTH_CRUSADE_STATES)[number];

export interface FourthCrusadeState {
  id: string;
  sequence: number;
  stateKind: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  datePrecision: string;
  placeIds: string[];
  held: 'held' | 'claimed_not_held' | 'not_applicable';
  evidenceClass: string;
  geometryProvenance: string;
  confidence: string;
  reviewState: string;
  sourceId: string;
  sourceLocator: string;
  /** A VMN layer this state points at rather than re-authoring. */
  vmnReference: string | null;
  notes: string;
  geometry: unknown | null;
}

const STAGES = pilot.itinerary as ItineraryStage[];
const STATES = pilot.states as FourthCrusadeState[];

export function getItinerary(): ItineraryStage[] {
  return [...STAGES].sort((a, b) => a.sequence - b.sequence);
}

export function getFourthCrusadeStates(): FourthCrusadeState[] {
  return [...STATES].sort((a, b) => a.sequence - b.sequence);
}

export function getCrusadesRelease(): {
  release: string;
  layerIds: string[];
  schemaVersion: number;
} {
  return { release: pilot.release, layerIds: pilot.layerIds, schemaVersion: pilot.schemaVersion };
}

/**
 * Total day-marks along the drawn road.
 *
 * This is the diagram's arithmetic, not a journey time. Matthew Paris drew a
 * day between stages; whether anyone walked it in that time is a separate
 * question the itinerary does not answer, and callers must present the figure
 * as the manuscript's claim rather than as a measurement.
 */
export function depictedJourneyLength(): { days: number; stagesWithMarks: number } {
  const marked = getItinerary().filter((stage) => stage.depictedDays !== null);
  return {
    days: marked.reduce((total, stage) => total + (stage.depictedDays ?? 0), 0),
    stagesWithMarks: marked.length,
  };
}

/** Stages where the witnesses disagree, or where the diagram branches. */
export function variantStages(): ItineraryStage[] {
  return getItinerary().filter((stage) => Boolean(stage.variantNote));
}

export function statesOfKind(kind: FourthCrusadeStateKind): FourthCrusadeState[] {
  return getFourthCrusadeStates().filter((state) => state.stateKind === kind);
}

/**
 * What was assigned as against what was held. The two lists are returned
 * separately and there is no function that merges them, which is the point.
 */
export function claimedAgainstHeld(): {
  claimed: FourthCrusadeState[];
  held: FourthCrusadeState[];
} {
  return {
    claimed: getFourthCrusadeStates().filter((state) => state.held === 'claimed_not_held'),
    held: getFourthCrusadeStates().filter((state) => state.held === 'held'),
  };
}

/** States with a drawable line. Three of the six have none, deliberately. */
export function drawableStates(): FourthCrusadeState[] {
  return getFourthCrusadeStates().filter((state) => state.geometry !== null);
}

/** VMN layers this pilot points at instead of re-authoring their data. */
export function vmnReferences(): string[] {
  return [
    ...new Set(
      getFourthCrusadeStates()
        .map((state) => state.vmnReference)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}
