/**
 * Atlas GIS documentation migration inventory (ATLAS-1213 / KAN-409).
 *
 * The audit that has to happen before any documentation link is rewritten: every
 * `documentationLinks` entry the GeoLayer registry exposes, classified by
 * audience, canonical owner and public destination.
 *
 * The registry currently publishes source ledgers, data dictionaries, decision
 * logs and developer deep-link guides as undifferentiated peer links. Migrating
 * them blind would either bury evidence a reader needs or promote build
 * documentation as public narrative. This module is the manifest that stops
 * that, and `documentation-inventory.test.ts` is what keeps it reconciled with
 * the live registry instead of drifting into a stale document.
 *
 * The public routes here are PROPOSALS. The Handbook route model is fixed by
 * KAN-410; this records where each document should land and why.
 */
import inventory from '../../data/atlas/documentation-inventory.json';

export type DocumentAudience =
  'public-scholarly' | 'mixed' | 'technical' | 'internal-governance' | 'obsolete-duplicate';

export type DocumentPublicFunction =
  | 'layer-explanation'
  | 'sources-evidence'
  | 'methodology'
  | 'glossary-data-fields'
  | 'editorial-decision'
  | 'citation-data-reuse'
  | 'technical-gateway';

/**
 * Pattern A renders the repository Markdown publicly as-is; Pattern B authors a
 * reader-facing record that references canonical data and source IDs. Mixed
 * documents take B, because the technical half must not travel with them.
 */
export type DocumentPattern = 'A' | 'B' | 'none';

export type DocumentDisposition =
  'migrate-public' | 'retain-technical' | 'retire' | 'internal-only';

export type LayerCoverage = 'covered' | 'partial' | 'gap' | 'exempt' | 'exempt-with-warning';

/**
 * What actually happened at cutover (ATLAS-1222 / KAN-418).
 *
 * The audit recorded an intention; this records the result. Every inventoried
 * entry carries one, so "the documentation was migrated" is a checkable claim
 * rather than an assertion.
 */
export type MigrationOutcome =
  | 'replaced-by-public-route'
  | 'split-public-and-technical'
  | 'repointed-to-existing-owner'
  | 'retained-technical'
  | 'internal-only'
  | 'deprecated';

/** Outcomes that must resolve to a public route on Terra Chartarum. */
export const PUBLIC_OUTCOMES: readonly MigrationOutcome[] = [
  'replaced-by-public-route',
  'split-public-and-technical',
  'repointed-to-existing-owner',
];

export interface InventoryDocument {
  id: string;
  title: string;
  repoPath: string;
  currentHref: string;
  audience: DocumentAudience;
  publicFunctions: DocumentPublicFunction[];
  canonicalOwner: string;
  pattern: DocumentPattern;
  publicRoute: string | null;
  disposition: DocumentDisposition;
  retainTechnicalLink: boolean;
  citedByLayers: string[];
  notes: string;
  /** Cutover result (KAN-418). */
  migrationOutcome: MigrationOutcome;
  implementedPattern: DocumentPattern;
  implementedRoute: string | null;
  outcomeNote: string;
}

export interface InventoryLink {
  layerId: string;
  label: string;
  documentId: string;
}

export interface LayerCoverageRow {
  layerId: string;
  coverage: LayerCoverage;
  missing: DocumentPublicFunction[];
  note: string;
}

const DOCUMENTS = inventory.documents as InventoryDocument[];
const LINKS = inventory.links as InventoryLink[];
const COVERAGE = inventory.layerCoverage.layers as LayerCoverageRow[];

export const DOCUMENTATION_INVENTORY = inventory;
export const INVENTORY_DOCUMENTS = DOCUMENTS;
export const INVENTORY_LINKS = LINKS;
export const INVENTORY_COVERAGE = COVERAGE;

/** Audiences whose content owes a reader a public route. */
export const PUBLIC_AUDIENCES: readonly DocumentAudience[] = ['public-scholarly', 'mixed'];

export function inventoryDocument(id: string): InventoryDocument {
  const doc = DOCUMENTS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown inventory document "${id}"`);
  return doc;
}

/** The documentation entries the inventory records for one layer, in registry order. */
export function inventoryLinksForLayer(layerId: string): InventoryLink[] {
  return LINKS.filter((link) => link.layerId === layerId);
}

export function coverageForLayer(layerId: string): LayerCoverageRow | undefined {
  return COVERAGE.find((row) => row.layerId === layerId);
}

/** Layers that cannot meet the publication contract as they stand (KAN-418 gate). */
export function layersMissingPublicDocumentation(): LayerCoverageRow[] {
  return COVERAGE.filter((row) => row.coverage === 'gap' || row.coverage === 'partial');
}

/** Entries still awaiting a public destination, if any. Empty is the release condition. */
export function unmigratedDocuments(): InventoryDocument[] {
  return DOCUMENTS.filter(
    (doc) => PUBLIC_OUTCOMES.includes(doc.migrationOutcome) && !doc.implementedRoute,
  );
}

/** Documents cited by more than one layer: the per-layer duplication hazards. */
export function sharedDocuments(): InventoryDocument[] {
  return DOCUMENTS.filter((doc) => doc.citedByLayers.length > 1);
}
