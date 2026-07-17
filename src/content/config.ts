import { defineCollection, z } from 'astro:content';
import { ROOM_SLUGS } from '../data/rooms';

// Canonical meta-lens dimensions (see registry.ts crosswalk, §5 of the plan).
export const CANONICAL_DIMENSIONS = [
  'measure',
  'witness',
  'use',
  'cosmos',
  'power',
  'silence',
] as const;

const essays = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    summary: z.string(),
    cover: z.string(), // path under /public (e.g. /covers/cartography.svg)
    // 'legacy' essays are rendered verbatim from public/essays/<slug>/ via the
    // host route's isolation boundary; 'native' essays are authored in MDX.
    status: z.enum(['legacy', 'native']).default('native'),
    embedPath: z.string().optional(), // legacy only: /essays/<slug>/index.html
    eras: z.array(z.string()).default([]),
    regions: z.array(z.string()).default([]),
    lenses: z.array(z.string()).default([]), // native/original axis names
    yearFrom: z.number(),
    yearTo: z.number(),
    mapCount: z.number().optional(),
    readingMinutes: z.number().optional(),
    accent: z.string().optional(), // CSS color for per-essay identity
    order: z.number().default(0),
    featured: z.boolean().default(false),
    // Seven-room cosmography (TC-102 / KAN-93). `room` is the essay's primary
    // room and is REQUIRED — the build fails on a missing or non-canonical slug.
    // `secondaryRooms` (0–2) lets an essay also surface in adjacent rooms;
    // `roomAnchor` marks the essay that headlines its room.
    room: z.enum(ROOM_SLUGS),
    secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2).default([]),
    roomAnchor: z.boolean().default(false),
    publishedAt: z.string(),
    updatedAt: z.string(),
    // Harmonized meta-lens scores, normalized 0-1 (additive, optional).
    metaScores: z.record(z.enum(CANONICAL_DIMENSIONS), z.number().min(0).max(1)).optional(),
  }),
});

export const collections = { essays };
