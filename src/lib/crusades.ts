/**
 * Crusades flagship: the Road, the Sea and the city both were pointed at
 * (KAN-386 to KAN-389, extended by KAN-438)
 *
 * Three registers, and one distinction each that the software has to keep.
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

/**
 * The flagship's gate state, and what is holding each gate (KAN-384 / KAN-385).
 *
 * The Dacia programme records why a trench is stopped and which ticket owns
 * each gate; this pilot recorded neither, so its open tickets read as blocked
 * for no stated reason. The registers are `data/crusades/reference/gates.csv`
 * and `verification-debt.csv`, joined by a `<proof>:<gate>` key, and the
 * validator enforces the join in both directions - an open item must name a
 * gate, and a gate below `passed` must have something naming it.
 */
export interface ProofGate {
  proof: string;
  gate: string;
  order: number;
  status: 'pending' | 'partial' | 'passed' | 'waived';
  jiraKey: string;
  evidence: string | null;
  note: string;
}

export interface CrusadesDebt {
  id: string;
  kind: 'verification' | 'rights';
  statement: string;
  /** `<proof>:<gate>` keys this item blocks. */
  blocks: string[];
  resolutionPath: string;
  status: string;
}

const GATES = pilot.gates as ProofGate[];
const DEBTS = pilot.debts as CrusadesDebt[];

export function getProofGates(): ProofGate[] {
  return [...GATES];
}

/** Open verification and rights debt. Resolved items are not compiled in. */
export function getOpenDebts(): CrusadesDebt[] {
  return [...DEBTS];
}

/**
 * Debt grouped by the Jira ticket that owns the gate it blocks.
 *
 * Grouped by ticket rather than by item for the reason `review.py blocked`
 * gives: one item blocking four tickets and four items blocking one ticket are
 * different situations, and only the ticket-shaped view says which you have.
 */
export function debtByTicket(): Array<{ ticket: string; debts: CrusadesDebt[] }> {
  const owner = new Map(GATES.map((g) => [`${g.proof}:${g.gate}`, g.jiraKey]));
  const byTicket = new Map<string, CrusadesDebt[]>();
  for (const debt of DEBTS) {
    for (const target of debt.blocks) {
      const ticket = owner.get(target);
      if (!ticket) continue;
      const list = byTicket.get(ticket) ?? [];
      if (!list.includes(debt)) list.push(debt);
      byTicket.set(ticket, list);
    }
  }
  return [...byTicket.entries()]
    .map(([ticket, debts]) => ({ ticket, debts }))
    .sort((a, b) => a.ticket.localeCompare(b.ticket));
}

/** How far each proof has come, as a count of gates that have actually passed. */
export function gateProgress(): Array<{ proof: string; passed: number; total: number }> {
  const proofs = [...new Set(GATES.map((g) => g.proof))].sort();
  return proofs.map((proof) => {
    const gates = GATES.filter((g) => g.proof === proof);
    return {
      proof,
      passed: gates.filter((g) => g.status === 'passed').length,
      total: gates.length,
    };
  });
}

/**
 * The Holy Land register (KAN-438).
 *
 * `sourceId` is null for later cartographic memory, and only for that: an
 * early-modern map that centres Jerusalem is a witness to the sixteenth
 * century, and the validator refuses it a row in the medieval source corpus so
 * that it cannot become a witness to the twelfth. What it has instead is a
 * catalogue record, which is the whole of its standing here.
 */
export interface JerusalemRole {
  id: string;
  sequence: number;
  roleKind: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  datePrecision: string;
  placeIds: string[];
  placeNames: string[];
  evidenceClass: string;
  geometryProvenance: 'modern_reference' | 'not_spatial';
  confidence: string;
  reviewState: string;
  sourceId: string | null;
  sourceLocator: string | null;
  /** A record in this site's own catalogue, joined by its stable id. */
  catalogueObjectId: string | null;
  vmnReference: string | null;
  notes: string;
}

/** The registers, in the order the essay argues them. */
export const JERUSALEM_REGISTERS = [
  'sacred_centre',
  'pilgrimage_destination',
  'textual_construct',
  'cartographic_construct',
  'network_node',
  'cartographic_memory',
] as const;
export type JerusalemRegister = (typeof JERUSALEM_REGISTERS)[number];

const ROLES = pilot.roles as JerusalemRole[];

export function getJerusalemRoles(): JerusalemRole[] {
  return [...ROLES].sort((a, b) => a.sequence - b.sequence);
}

export function rolesInRegister(register: JerusalemRegister): JerusalemRole[] {
  return getJerusalemRoles().filter((role) => role.roleKind === register);
}

/**
 * The records that are about a place on the ground, and therefore the only ones
 * on a layer. Everything else in the register is a claim about what the city
 * meant, and a claim about meaning has no coordinate.
 */
export function placedRoles(): JerusalemRole[] {
  return getJerusalemRoles().filter((role) => role.geometryProvenance === 'modern_reference');
}

export function unplacedRoles(): JerusalemRole[] {
  return getJerusalemRoles().filter((role) => role.geometryProvenance === 'not_spatial');
}

/** Catalogue records this register points at rather than describing again. */
export function catalogueObjects(): string[] {
  return [
    ...new Set(
      getJerusalemRoles()
        .map((role) => role.catalogueObjectId)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}
