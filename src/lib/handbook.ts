/**
 * Atlas Handbook content model and route contract (ATLAS-1214 / KAN-410).
 *
 * The KAN-409 audit found nineteen layers pointing at nine GitHub documents with
 * nothing to say which explained the map and which explained the build. This
 * module is the model that replaces that: a validated public documentation
 * record, a frozen route scheme, and the filtering rules that decide what may be
 * generated at all.
 *
 * Three architectural rules are load-bearing and are enforced here rather than
 * left to reviewer discipline:
 *
 * 1. **Terra Chartarum is the canonical public scholarly surface.** GitHub stays
 *    the reproducibility surface and is reachable from `technicalLinks`, never
 *    as a document's primary explanation.
 * 2. **No runtime dependency on Confluence.** A governance URL cannot be a
 *    document's content source, and `assertNoGovernanceDependency` fails the
 *    build if one becomes required reading.
 * 3. **One canonical identity.** A document references canonical layer, source,
 *    collection and essay IDs; it never mints a parallel one. Which is why the
 *    route decision below is what it is.
 */
import { z } from 'astro:content';

/**
 * Document types, and what each one is *for*. The distinction is the audit's
 * central finding made structural: a source ledger and a build guide are not
 * the same kind of thing and must not render as peers.
 */
export const HANDBOOK_DOC_TYPES = [
  /** The public explanation of one canonical layer. At most one per layer. */
  'layer',
  /** A shared method several layers cite. Never restated per layer. */
  'method',
  /** A source/evidence ledger: what the claim rests on. */
  'evidence',
  /** Reader-facing field meanings and controlled vocabularies. */
  'data-fields',
  /** A single site-wide glossary of terms. */
  'glossary',
  /** An editorial decision and its reasoning. */
  'editorial-decision',
  /** The deliberately secondary gateway to schemas, history and raw assets. */
  'technical',
] as const;
export type HandbookDocType = (typeof HANDBOOK_DOC_TYPES)[number];

/**
 * Publication lifecycle. Distinct from a layer's editorial lifecycle: this says
 * whether the *document* may be generated, not whether the scholarship is
 * settled.
 */
export const HANDBOOK_LIFECYCLES = ['published', 'in-review', 'draft', 'internal'] as const;
export type HandbookLifecycle = (typeof HANDBOOK_LIFECYCLES)[number];

/** Only these reach a static public page. `draft` and `internal` never do. */
export const PUBLISHABLE_LIFECYCLES: readonly HandbookLifecycle[] = ['published', 'in-review'];

/**
 * Authoring patterns, from the KAN-409 audit.
 *
 * **A** - repository Markdown is itself the public content and renders through
 * Astro. Correct when the document is wholly reader-facing.
 *
 * **B** - a dedicated reader-facing record references canonical data and source
 * IDs. Correct when the source Markdown mixes technical and public material,
 * because in Pattern A the technical half travels with it.
 */
export const HANDBOOK_PATTERNS = ['A', 'B'] as const;
export type HandbookPattern = (typeof HANDBOOK_PATTERNS)[number];

/** Route roots. Frozen by this ticket; changing one is a redirect exercise. */
export const HANDBOOK_ROOT = '/atlas/handbook/';
export const LAYER_ROUTE_ROOT = '/atlas/layers/';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The route each document type occupies.
 *
 * `glossary` is a singleton route with no slug segment - there is one glossary,
 * and a second would be two vocabularies for one site.
 *
 * `editorial-decision` takes `/atlas/handbook/decisions/{slug}/`, which extends
 * the route list in the ticket. The list named methods, evidence, glossary,
 * data-fields and technical but the document type exists and KAN-411 requires a
 * landing entry point for it, so a route was needed; filing decisions under
 * methods would have merged two genuinely different kinds of claim.
 */
const ROUTE_SEGMENTS: Record<HandbookDocType, string | null> = {
  layer: null, // special-cased: /atlas/layers/{layerId}/
  method: 'methods',
  evidence: 'evidence',
  'data-fields': 'data-fields',
  glossary: null, // singleton
  'editorial-decision': 'decisions',
  technical: 'technical',
};

/** Index routes the Handbook shell renders, in navigation order. */
export const HANDBOOK_INDEX_ROUTES = [
  { title: 'Layer catalogue', route: `${HANDBOOK_ROOT}layers/` },
  { title: 'Methods', route: `${HANDBOOK_ROOT}methods/` },
  { title: 'Sources & evidence', route: `${HANDBOOK_ROOT}evidence/` },
  { title: 'Glossary', route: `${HANDBOOK_ROOT}glossary/` },
  { title: 'Data fields', route: `${HANDBOOK_ROOT}data-fields/` },
  { title: 'Editorial decisions', route: `${HANDBOOK_ROOT}decisions/` },
  { title: 'Technical & reproducibility', route: `${HANDBOOK_ROOT}technical/` },
] as const;

/**
 * Frontmatter fields, as a plain object schema. Astro content collections take
 * this; the refined `HandbookDocSchema` below adds the cross-field rules and is
 * what the projection parses with.
 */
export const HandbookDocFields = z.object({
  id: z.string().regex(SLUG, 'Document IDs are lowercase kebab-case'),
  title: z.string().min(1),
  summary: z.string().min(1),
  docType: z.enum(HANDBOOK_DOC_TYPES),
  lifecycle: z.enum(HANDBOOK_LIFECYCLES).default('draft'),
  pattern: z.enum(HANDBOOK_PATTERNS),
  /** Programme the document belongs to, e.g. `vmn`, `hanseatic`, `dacia`, `atlas`. */
  programme: z.string().regex(SLUG),
  /** Required for and only for `layer` documents: the canonical layer it explains. */
  layerId: z.string().optional(),
  /**
   * Route slug. Omitted for `layer` (the canonical layer ID is the slug) and for
   * `glossary` (a singleton route). Named `routeSlug` rather than `slug` because
   * Astro reserves `slug` on a content collection for its own filename-derived
   * identifier, and a document may not have two.
   */
  routeSlug: z.string().regex(SLUG).optional(),
  /** Canonical IDs this document relates to. Resolved at build time (KAN-412). */
  relatedLayerIds: z.array(z.string()).default([]),
  relatedCollectionIds: z.array(z.string()).default([]),
  relatedEssaySlugs: z.array(z.string()).default([]),
  relatedSourceIds: z.array(z.string()).default([]),
  /** Shared documents this one defers to instead of restating. */
  referencesDocIds: z.array(z.string()).default([]),
  /** Review metadata. `reviewedBy` is a named person or it is absent. */
  lastReviewed: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  reviewedBy: z.string().min(1).optional(),
  /** Citation and version metadata propagated to the public page. */
  citation: z
    .object({
      version: z.string().min(1),
      licence: z.string().min(1),
      stableUrl: z.string().optional(),
    })
    .optional(),
  /** The secondary Advanced/Technical gateway. Never a document's only explanation. */
  technicalLinks: z.array(z.object({ label: z.string(), href: z.string().url() })).default([]),
  /**
   * A minimal record for a context layer. Natural Earth does not owe a reader
   * a reconstruction-and-uncertainty section; it does owe source, licence and -
   * for present-day boundaries - an anachronism note.
   */
  minimalContext: z.boolean().default(false),
  anachronismNote: z.string().min(1).optional(),
});

export const HandbookDocSchema = HandbookDocFields.superRefine((doc, ctx) => {
  const fail = (path: string, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

  if (doc.docType === 'layer' && !doc.layerId) {
    fail('layerId', `Layer document "${doc.id}" must name the layer it explains`);
  }
  if (doc.docType !== 'layer' && doc.layerId) {
    fail('layerId', `Document "${doc.id}" is not a layer record but claims a layerId`);
  }
  // A layer's route is its canonical ID and a glossary has one route, so a
  // slug on either is a second identity waiting to diverge.
  if ((doc.docType === 'layer' || doc.docType === 'glossary') && doc.routeSlug) {
    fail('routeSlug', `Document "${doc.id}" of type ${doc.docType} must not declare a slug`);
  }
  if (doc.docType !== 'layer' && doc.docType !== 'glossary' && !doc.routeSlug) {
    fail('routeSlug', `Document "${doc.id}" of type ${doc.docType} needs a route slug`);
  }
  if (doc.minimalContext && doc.docType !== 'layer') {
    fail('minimalContext', `Only a layer record can take the minimal-context exemption`);
  }
  if (doc.anachronismNote && !doc.minimalContext) {
    fail('anachronismNote', `Document "${doc.id}" notes an anachronism outside a context record`);
  }
  // A publishable document is one a reader is asked to trust, so it must say
  // who last stood behind it.
  if (PUBLISHABLE_LIFECYCLES.includes(doc.lifecycle) && !doc.lastReviewed) {
    fail('lastReviewed', `Public document "${doc.id}" must record when it was last reviewed`);
  }
  if (doc.reviewedBy && !doc.lastReviewed) {
    fail('lastReviewed', `Document "${doc.id}" names a reviewer but no review date`);
  }
});

export type HandbookDoc = z.infer<typeof HandbookDocSchema>;

/**
 * The public route for a document.
 *
 * **The canonical layer ID is always the public slug.** No alias layer exists:
 * an alias is a second name for one thing, and the epic's whole purpose is to
 * stop the same layer having two identities in two places. The cost is that
 * renaming a layer ID is a redirect exercise, which is the correct cost.
 */
export function handbookRoute(doc: Pick<HandbookDoc, 'docType' | 'layerId' | 'routeSlug'>): string {
  if (doc.docType === 'layer') {
    if (!doc.layerId) throw new Error('Layer document has no layerId');
    return `${LAYER_ROUTE_ROOT}${doc.layerId}/`;
  }
  if (doc.docType === 'glossary') return `${HANDBOOK_ROOT}glossary/`;
  const segment = ROUTE_SEGMENTS[doc.docType];
  if (!segment || !doc.routeSlug) {
    throw new Error(`Document of type ${doc.docType} has no route`);
  }
  return `${HANDBOOK_ROOT}${segment}/${doc.routeSlug}/`;
}

/** True when this lifecycle may be rendered to a static public page. */
export function isPublishable(doc: Pick<HandbookDoc, 'lifecycle'>): boolean {
  return PUBLISHABLE_LIFECYCLES.includes(doc.lifecycle);
}

export interface HandbookValidationContext {
  layerIds: Iterable<string>;
  collectionIds: Iterable<string>;
  /** Essay slugs that have passed the staged-release gate. Held essays are absent. */
  releasedEssaySlugs: Iterable<string>;
  sourceIds?: Iterable<string>;
}

/**
 * Whole-corpus validation: the rules that need every document at once.
 *
 * Unresolved required references are failures, not warnings. A public page that
 * links to a layer that does not exist is a broken scholarly claim, and the
 * build is the last place it can be caught cheaply.
 */
export function validateHandbookDocs(
  docs: HandbookDoc[],
  context: HandbookValidationContext,
): string[] {
  const errors: string[] = [];
  const layerIds = new Set(context.layerIds);
  const collectionIds = new Set(context.collectionIds);
  const released = new Set(context.releasedEssaySlugs);
  const sourceIds = context.sourceIds ? new Set(context.sourceIds) : null;
  const docIds = new Set(docs.map((doc) => doc.id));

  const seenIds = new Set<string>();
  const seenRoutes = new Map<string, string>();
  const layerOwners = new Map<string, string[]>();

  for (const doc of docs) {
    if (seenIds.has(doc.id)) errors.push(`Duplicate document ID "${doc.id}"`);
    seenIds.add(doc.id);

    const route = handbookRoute(doc);
    const owner = seenRoutes.get(route);
    if (owner) errors.push(`Documents "${owner}" and "${doc.id}" both claim route ${route}`);
    seenRoutes.set(route, doc.id);

    if (doc.docType === 'layer' && doc.layerId) {
      layerOwners.set(doc.layerId, [...(layerOwners.get(doc.layerId) ?? []), doc.id]);
      if (!layerIds.has(doc.layerId)) {
        errors.push(`Document "${doc.id}" explains unknown layer "${doc.layerId}"`);
      }
    }

    for (const id of doc.relatedLayerIds) {
      if (!layerIds.has(id)) errors.push(`Document "${doc.id}" references unknown layer "${id}"`);
    }
    for (const id of doc.relatedCollectionIds) {
      if (!collectionIds.has(id)) {
        errors.push(`Document "${doc.id}" references unknown collection "${id}"`);
      }
    }
    for (const id of doc.referencesDocIds) {
      if (!docIds.has(id)) errors.push(`Document "${doc.id}" references unknown document "${id}"`);
    }
    if (sourceIds) {
      for (const id of doc.relatedSourceIds) {
        if (!sourceIds.has(id)) {
          errors.push(`Document "${doc.id}" references unknown source "${id}"`);
        }
      }
    }

    // A held essay must not be reachable from a public page, by title, anchor or
    // link. Filtering happens before render; a public doc that still declares one
    // is an authoring error, not something to silently drop.
    if (isPublishable(doc)) {
      for (const slug of doc.relatedEssaySlugs) {
        if (!released.has(slug)) {
          errors.push(`Public document "${doc.id}" links held essay "${slug}"`);
        }
      }
      for (const id of doc.referencesDocIds) {
        const target = docs.find((entry) => entry.id === id);
        if (target && !isPublishable(target)) {
          errors.push(`Public document "${doc.id}" references non-public document "${id}"`);
        }
      }
    }
  }

  for (const [layerId, owners] of layerOwners) {
    if (owners.length > 1) {
      errors.push(`Layer "${layerId}" has ${owners.length} owners: ${owners.join(', ')}`);
    }
  }

  return errors;
}

/** Canonical layer ID to public route, for the Atlas to link into the Handbook. */
export function documentationRoutes(docs: HandbookDoc[]): Record<string, string> {
  const routes: Record<string, string> = {};
  for (const doc of docs) {
    if (doc.docType === 'layer' && doc.layerId && isPublishable(doc)) {
      routes[doc.layerId] = handbookRoute(doc);
    }
  }
  return routes;
}

const GOVERNANCE_HOSTS = ['atlassian.net', 'jira.com'];

/**
 * Governance surfaces may not become required public reading. A Confluence or
 * Jira URL anywhere in a published document's content source or technical links
 * is a build failure - the public site must never send a reader to a login.
 */
export function assertNoGovernanceDependency(docs: HandbookDoc[]): string[] {
  const errors: string[] = [];
  for (const doc of docs.filter(isPublishable)) {
    for (const link of doc.technicalLinks) {
      if (GOVERNANCE_HOSTS.some((host) => link.href.includes(host))) {
        errors.push(`Public document "${doc.id}" links governance surface ${link.href}`);
      }
    }
  }
  return errors;
}
