/**
 * GeoCollection registry (ATLAS-1202 / KAN-398).
 *
 * A collection is an editorial bundle over canonical layer IDs - a curated
 * historical argument assembled from layers that already exist, never a second
 * copy of their data. One layer belongs to as many collections as the argument
 * needs: the Roman Dacia layers are both Dacia programme material and Roman
 * geography, and they are one dataset either way.
 *
 * Defaults live HERE and not on the layer. Whether `venetian-routes` should be
 * on when you arrive is a question about the composition you are being shown,
 * and the same layer answers it differently inside two different collections.
 * That is why KAN-397 deliberately left `collectionDefault` off the layer.
 *
 * Referential integrity is shared with the rest of the site rather than
 * reinvented: `data/contracts/registry-sources.json` declares this module as the
 * `collections` registry and its layer/essay references as relations, so the
 * KAN-379 gate resolves them alongside every other registry. The checks below
 * are the ones the graph audit cannot express - subset, duplicate, lifecycle and
 * temporal coherence - and they run at module load so a bad bundle fails the
 * build rather than the browser.
 */
import { z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';
import { GEO_LAYERS, type GeoLayer } from './geo';

export const GeoCollectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    /** One sentence, shown on the collection card. */
    summary: z.string(),
    /** Optional longer editorial framing, shown when the collection is opened. */
    description: z.string().optional(),
    /** Canonical layer IDs. Order is the reading order inside the collection. */
    layerIds: z.array(z.string()).min(1),
    /** The composition activated by "Activate defaults". Must be a subset of `layerIds`. */
    defaultLayerIds: z.array(z.string()).default([]),
    /**
     * Editorial narrowing of the temporal envelope. Normally omitted: the extent
     * is derived from the member layers. Supplying it requires both bounds and a
     * `temporalNote`, so a collection can never quietly contradict its members.
     */
    yearFrom: z.number().optional(),
    yearTo: z.number().optional(),
    temporalNote: z.string().min(1).optional(),
    room: z.enum(ROOM_SLUGS).optional(),
    secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2).default([]),
    essaySlugs: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    sortWeight: z.number().default(0),
  })
  .superRefine((collection, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (new Set(collection.layerIds).size !== collection.layerIds.length) {
      fail('layerIds', `Collection "${collection.id}" repeats a member layer`);
    }
    if (new Set(collection.defaultLayerIds).size !== collection.defaultLayerIds.length) {
      fail('defaultLayerIds', `Collection "${collection.id}" repeats a default layer`);
    }
    for (const id of collection.defaultLayerIds) {
      if (!collection.layerIds.includes(id)) {
        fail('defaultLayerIds', `Collection "${collection.id}" defaults to non-member "${id}"`);
      }
    }

    const hasFrom = collection.yearFrom !== undefined;
    const hasTo = collection.yearTo !== undefined;
    if (hasFrom !== hasTo) {
      fail('yearTo', `Collection "${collection.id}" must override both temporal bounds or neither`);
    }
    if (hasFrom && !collection.temporalNote) {
      fail(
        'temporalNote',
        `Collection "${collection.id}" overrides its temporal extent and must say why`,
      );
    }
    if (!hasFrom && collection.temporalNote) {
      fail(
        'temporalNote',
        `Collection "${collection.id}" explains a temporal override it does not make`,
      );
    }
    if (hasFrom && hasTo && collection.yearFrom! > collection.yearTo!) {
      fail('yearTo', `Collection "${collection.id}" ends before it begins`);
    }
  });

export type GeoCollection = z.infer<typeof GeoCollectionSchema>;

const RAW: unknown[] = [
  {
    id: 'venetian-maritime-network',
    title: 'The Venetian maritime network',
    summary:
      'The stato da màr as Venice ran it: harbours, the convoy lines between them, and the ground the Republic actually held.',
    description:
      'Ports and routes come on together because the network is the argument - a harbour matters here for what sailed to it. Possessions stay off by default: the fills are the slowest claim on the map to read and the easiest to mistake for sovereignty.',
    layerIds: ['venetian-ports', 'venetian-routes', 'venetian-possessions'],
    defaultLayerIds: ['venetian-ports', 'venetian-routes'],
    room: 'road',
    secondaryRooms: ['border'],
    // `invisible-maps-trade` is held, and is named here rather than added on
    // release day (ATLAS-1223 / KAN-434). The catalogue filters this list
    // against released essays, so nothing about a held essay reaches a reader,
    // and the relationship appears by itself once it does release. This is the
    // staged-release-safe route the ticket asks for, in place of the bespoke
    // Atlas CTA that used to promote the standalone embed.
    essaySlugs: ['venice-sicily', 'invisible-maps-trade'],
    tags: ['venice', 'mediterranean', 'maritime', 'trade', 'stato da mar', 'empire'],
    featured: true,
    sortWeight: 10,
  },
  {
    id: 'hanseatic-world',
    title: 'The Hanseatic world',
    summary:
      'A league drawn as what it was - cities, corridors and institutional events - and never as a territory it never had.',
    description:
      'The composition is deliberately network-shaped. There is no polygon to switch on here, because the League held privileges in places rather than ground between them, and a fill would assert exactly the thing the programme spent its evidence disproving.',
    layerIds: ['hanseatic-places', 'hanseatic-routes', 'hanseatic-events'],
    defaultLayerIds: ['hanseatic-places', 'hanseatic-routes'],
    room: 'road',
    secondaryRooms: ['city'],
    essaySlugs: ['the-league-that-left-no-map'],
    tags: ['hansa', 'hanseatic league', 'baltic', 'north sea', 'trade', 'kontor'],
    featured: true,
    sortWeight: 20,
  },
  {
    id: 'corpus-chartarum-daciae',
    title: 'Corpus Chartarum Daciae',
    summary:
      'The Dacia programme on one map: where sources name places, what the province looked like, and how the frontier moved between 1829 and 1947.',
    description:
      'The defaults are the two territorial layers, which is the corpus at its most legible. The research tier is a member and can be switched on, but it can never be a default: nothing in it has been through human review, and a layer nobody cleared should not appear because a reader opened a collection.',
    layerIds: [
      'dacia-attestations',
      'dacia-attestations-research',
      'dacia-roman-sites',
      'dacia-roman-network',
      'dacia-principalities',
      'dacia-josephinian-sheets',
      'dacia-treaty-frontiers',
    ],
    defaultLayerIds: ['dacia-principalities', 'dacia-treaty-frontiers'],
    room: 'archive',
    secondaryRooms: ['border'],
    essaySlugs: ['dacia'],
    tags: ['dacia', 'transylvania', 'wallachia', 'moldavia', 'toponyms', 'frontiers', 'corpus'],
    featured: true,
    sortWeight: 30,
  },
  {
    id: 'roman-geography',
    title: 'Roman geography',
    summary:
      'The empire at its greatest reach and one province in detail - the same Roman Dacia layers, read as Roman rather than as Dacian.',
    description:
      'This collection shares three layers with the Dacia programme and duplicates none of them. A layer belongs to the argument being made about it, and the roads of Roman Dacia are evidence in two arguments at once.',
    layerIds: ['roman-empire-117', 'dacia-roman-sites', 'dacia-roman-network'],
    defaultLayerIds: ['roman-empire-117'],
    yearFrom: 106,
    yearTo: 271,
    temporalNote:
      'Narrowed from the members’ envelope to the life of the province: the empire layer runs to 271 but is drawn for AD 117, and the collection is about the province, not about the whole imperial span.',
    room: 'border',
    secondaryRooms: ['archive'],
    essaySlugs: ['dacia'],
    tags: ['rome', 'roman empire', 'trajan', 'provinces', 'antiquity', 'limes'],
    featured: false,
    sortWeight: 40,
  },
  {
    id: 'terra-incognita',
    title: 'Terra Incognita',
    summary:
      'A continent that was drawn before it was seen, and the tracks, sightings and removals that slowly replaced the drawing with a coastline.',
    description:
      'There is no default composition. Every layer here is in review and not one record has been read against its source, so a reader who opens this collection is shown nothing as established: the layers have to be switched on deliberately. The ghost layer is a member although its asset is empty, because a reader looking for the disproved features should find the record of why none of them can yet be placed.',
    layerIds: [
      'antarctica-conjectured-south',
      'antarctica-expedition-tracks',
      'antarctica-observations',
      'antarctica-ghost-geographies',
    ],
    defaultLayerIds: [],
    room: 'theatre',
    secondaryRooms: ['map'],
    tags: [
      'antarctica',
      'terra australis',
      'polar',
      'southern ocean',
      'cook',
      'endurance',
      'ghost geography',
      'discovery',
    ],
    featured: false,
    sortWeight: 50,
  },
  {
    id: 'maps-for-a-crusade',
    title: 'Maps for a Crusade',
    summary:
      'A drawn road that is not a map, a sea campaign whose intention, diversion, claim and possession were four different things, and the city all of it was pointed at.',
    description:
      'The three registers of the Crusades flagship, held together because the argument runs between them: a thirteenth-century itinerary organises the world as a sequence of days, fifty years earlier a fleet had already organised it as ports, contracts and control, and Jerusalem is the middle of a world image, the end of a road and a working port in different registers at once. No member has a default, because no witness in this corpus is cleared for publication and no folio has been transcribed.',
    layerIds: [
      'crusades-itinerary',
      'crusades-fourth-crusade-routes',
      'crusades-fourth-crusade-events',
      'crusades-jerusalem-network',
    ],
    defaultLayerIds: [],
    room: 'road',
    secondaryRooms: ['border'],
    tags: [
      'crusades',
      'matthew paris',
      'fourth crusade',
      'venice',
      'constantinople',
      'itinerary',
      'pilgrimage',
      'jerusalem',
      'holy land',
    ],
    featured: false,
    sortWeight: 60,
  },
];

/**
 * Cross-registry checks that need the layer registry in hand. The Zod schema
 * cannot see GEO_LAYERS, and the KAN-379 graph audit resolves IDs but not the
 * lifecycle and temporal rules, so this is where those live.
 */
function validateAgainstLayers(collections: GeoCollection[]): void {
  const layers = new Map<string, GeoLayer>(GEO_LAYERS.map((layer) => [layer.id, layer]));
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const collection of collections) {
    if (seen.has(collection.id)) errors.push(`Duplicate collection ID "${collection.id}"`);
    seen.add(collection.id);

    for (const id of collection.layerIds) {
      if (!layers.has(id)) {
        errors.push(`Collection "${collection.id}" references unknown layer "${id}"`);
      }
    }

    // A default composition is shown to a reader who asked for nothing in
    // particular, so it may only contain layers whose scholarship is published.
    // This is what keeps the unreviewed CND research tier out of every default.
    for (const id of collection.defaultLayerIds) {
      const layer = layers.get(id);
      if (layer && layer.lifecycle !== 'published') {
        errors.push(
          `Collection "${collection.id}" defaults to "${id}", whose lifecycle is "${layer.lifecycle}"`,
        );
      }
    }

    const members = collection.layerIds.map((id) => layers.get(id)).filter(Boolean) as GeoLayer[];

    // The other half of the same rule. A collection whose every member is still
    // in review has no legitimate default composition, and must declare none:
    // there is nothing it could activate that a reader has not been warned
    // about. Any collection with at least one published member owes a default,
    // because "Activate defaults" that does nothing is a broken control.
    const publishable = members.filter((layer) => layer.lifecycle === 'published');
    if (publishable.length > 0 && collection.defaultLayerIds.length === 0) {
      errors.push(
        `Collection "${collection.id}" has published members but declares no default composition`,
      );
    }
    if (publishable.length === 0 && collection.defaultLayerIds.length > 0) {
      errors.push(
        `Collection "${collection.id}" defaults to something although no member is published`,
      );
    }

    if (members.length > 0 && collection.yearFrom !== undefined) {
      const derivedFrom = Math.min(...members.map((l) => l.yearFrom));
      const derivedTo = Math.max(...members.map((l) => l.yearTo));
      // An override may narrow the envelope - that is editorial focus. It may
      // not widen it, because a collection cannot cover years its members do not.
      if (collection.yearFrom! < derivedFrom || collection.yearTo! > derivedTo) {
        errors.push(
          `Collection "${collection.id}" claims ${collection.yearFrom}-${collection.yearTo}, ` +
            `outside its members' ${derivedFrom}-${derivedTo}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`GeoCollection registry is invalid:\n  ${errors.join('\n  ')}`);
  }
}

export const GEO_COLLECTIONS: GeoCollection[] = (() => {
  const parsed = RAW.map((entry) => GeoCollectionSchema.parse(entry));
  validateAgainstLayers(parsed);
  return parsed.sort((a, b) => a.sortWeight - b.sortWeight || a.id.localeCompare(b.id));
})();

export function getGeoCollections(): GeoCollection[] {
  return GEO_COLLECTIONS;
}

export function getGeoCollection(id: string): GeoCollection | undefined {
  return GEO_COLLECTIONS.find((collection) => collection.id === id);
}

/** Collections a layer belongs to, in catalogue order. Many-to-many, by design. */
export function collectionsForLayer(layerId: string): GeoCollection[] {
  return GEO_COLLECTIONS.filter((collection) => collection.layerIds.includes(layerId));
}

/**
 * The temporal envelope a collection actually spans: its editorial override when
 * it declares one, otherwise the union of its members.
 */
export function collectionExtent(collection: GeoCollection): { from: number; to: number } {
  if (collection.yearFrom !== undefined && collection.yearTo !== undefined) {
    return { from: collection.yearFrom, to: collection.yearTo };
  }
  const members = GEO_LAYERS.filter((layer) => collection.layerIds.includes(layer.id));
  return {
    from: Math.min(...members.map((layer) => layer.yearFrom)),
    to: Math.max(...members.map((layer) => layer.yearTo)),
  };
}
