// Section-level room membership (TC-104 / KAN-95).
//
// An essay carries a primary `room` (and up to two secondaries), but a single
// chapter can belong somewhere else entirely — e.g. the Sicilian cadastre
// chapter of a Road essay is really about The Border. Authors declare those
// chapters in the essay's `sections` frontmatter (each with an `id` matching an
// anchor in the rendered body). This module flattens those declarations into a
// queryable list the room pages consume, resolving each to a deep link.

import { getEssays } from './registry';
import { getRoom, type RoomSlug } from '../data/rooms';

/** A tagged essay chapter, resolved to a deep link into its essay. */
export interface RoomSection {
  /** Slug of the essay the section lives in. */
  essaySlug: string;
  /** Title of the parent essay (for display context on a room page). */
  essayTitle: string;
  /** Anchor id within the essay body. */
  id: string;
  /** Section heading / display title. */
  title: string;
  /** The section's primary room. */
  room: RoomSlug;
  /** Additional rooms this section surfaces in (0–2). */
  secondaryRooms: RoomSlug[];
  /** Whether this section headlines its room. */
  roomAnchor: boolean;
  /** Deep link to the chapter: /essays/<slug>/#<id>. */
  href: string;
}

/** The minimal essay shape the flattener needs (frontmatter `sections`). */
export interface EssaySectionSource {
  slug: string;
  title: string;
  sections: Array<{
    id: string;
    title: string;
    room: RoomSlug;
    secondaryRooms: RoomSlug[];
    roomAnchor: boolean;
  }>;
}

/** Flatten essays' `sections` into deep-linkable room memberships (pure). */
export function flattenSections(essays: EssaySectionSource[]): RoomSection[] {
  return essays.flatMap((essay) =>
    essay.sections.map((s) => ({
      essaySlug: essay.slug,
      essayTitle: essay.title,
      id: s.id,
      title: s.title,
      room: s.room,
      secondaryRooms: s.secondaryRooms,
      roomAnchor: s.roomAnchor,
      href: `/essays/${essay.slug}/#${s.id}`,
    })),
  );
}

/** Sections belonging to `room`, primary memberships first, then secondary (pure). */
export function sectionsByRoom(sections: RoomSection[], room: RoomSlug): RoomSection[] {
  const primary = sections.filter((s) => s.room === room);
  const secondary = sections.filter((s) => s.room !== room && s.secondaryRooms.includes(room));
  return [...primary, ...secondary];
}

/** True when `room` is one of the seven canonical rooms. */
export function isCanonicalRoom(room: string): room is RoomSlug {
  return getRoom(room) !== undefined;
}

/** Every tagged section across all essays, in essay reading order. */
export async function getRoomSections(): Promise<RoomSection[]> {
  const essays = await getEssays();
  return flattenSections(
    essays.map((e) => ({ slug: e.slug, title: e.data.title, sections: e.data.sections })),
  );
}

/** Sections that belong to `room`, primary first then secondary. */
export async function getSectionsByRoom(room: RoomSlug): Promise<RoomSection[]> {
  return sectionsByRoom(await getRoomSections(), room);
}
