import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import {
  flattenSections,
  sectionsByRoom,
  isCanonicalRoom,
  type EssaySectionSource,
} from './room-sections';
import { ROOM_SLUGS } from '../data/rooms';

// Section-level room tagging (KAN-95). The async getRoomSections wiring is a thin
// wrapper over getEssays (not runnable under the astro:content vitest shim), so
// the flatten/filter logic is tested pure here, and the AC — a Border-tagged
// chapter of "La Rotta e il Catasto" with a working deep link — is verified by
// reading the real essay frontmatter off disk.

const SLUGS = new Set<string>(ROOM_SLUGS);

const FIXTURE: EssaySectionSource[] = [
  {
    slug: 'venice-sicily',
    title: 'La Rotta e il Catasto',
    sections: [
      {
        id: 'sicilia',
        title: 'An island that was owned',
        room: 'border',
        secondaryRooms: [],
        roomAnchor: false,
      },
      {
        id: 'registro',
        title: 'Double-entry worldviews',
        room: 'border',
        secondaryRooms: ['archive'],
        roomAnchor: false,
      },
    ],
  },
  {
    slug: 'starter-example',
    title: 'Anatomy of a Native Essay',
    sections: [
      {
        id: 'on-abstraction',
        title: 'Theatre',
        room: 'theatre',
        secondaryRooms: ['map'],
        roomAnchor: false,
      },
    ],
  },
];

describe('flattenSections', () => {
  it('resolves each section to a /essays/<slug>/#<id> deep link', () => {
    const flat = flattenSections(FIXTURE);
    expect(flat).toHaveLength(3);
    const sicilia = flat.find((s) => s.id === 'sicilia')!;
    expect(sicilia.href).toBe('/essays/venice-sicily/#sicilia');
    expect(sicilia.essayTitle).toBe('La Rotta e il Catasto');
    expect(sicilia.room).toBe('border');
  });
});

describe('sectionsByRoom', () => {
  it('returns primary memberships before secondary ones', () => {
    const flat = flattenSections(FIXTURE);
    const border = sectionsByRoom(flat, 'border');
    // Two primary (sicilia, registro); no border secondaries here.
    expect(border.map((s) => s.id)).toEqual(['sicilia', 'registro']);

    const map = sectionsByRoom(flat, 'map');
    // Only the starter section, via secondary membership.
    expect(map.map((s) => s.id)).toEqual(['on-abstraction']);

    const archive = sectionsByRoom(flat, 'archive');
    expect(archive.map((s) => s.id)).toEqual(['registro']);
  });
});

describe('isCanonicalRoom', () => {
  it('accepts the seven rooms and rejects anything else', () => {
    expect(isCanonicalRoom('border')).toBe(true);
    expect(isCanonicalRoom('atlas')).toBe(false);
    expect(isCanonicalRoom('')).toBe(false);
  });
});

describe('essay frontmatter (AC)', () => {
  const essaysDir = fileURLToPath(new URL('../content/essays', import.meta.url));

  function readSections(file: string) {
    const raw = readFileSync(`${essaysDir}/${file}`, 'utf8');
    const { data } = matter(raw);
    return { slug: file.replace(/\.(md|mdx)$/, ''), data };
  }

  it('every declared section across all essays uses canonical rooms', () => {
    const files = readdirSync(essaysDir).filter((f) => /\.(md|mdx)$/.test(f));
    for (const file of files) {
      const { slug, data } = readSections(file);
      const sections = (data.sections ?? []) as Array<{ room: string; secondaryRooms?: string[] }>;
      for (const s of sections) {
        expect(SLUGS.has(s.room), `${slug} section primary "${s.room}"`).toBe(true);
        for (const sec of s.secondaryRooms ?? []) {
          expect(SLUGS.has(sec), `${slug} section secondary "${sec}"`).toBe(true);
        }
      }
    }
  });

  it('La Rotta e il Catasto tags a chapter to The Border with a deep link', () => {
    const { data } = readSections('venice-sicily.md');
    const sections = (data.sections ?? []) as Array<{ id: string; room: string }>;
    const border = sections.find((s) => s.room === 'border');
    expect(border, 'venice-sicily has a Border-tagged section').toBeDefined();
    // The id must resolve to a real anchor in the legacy embed for the deep link.
    const embed = fileURLToPath(
      new URL('../../public/embed/venice-sicily/index.html', import.meta.url),
    );
    const html = readFileSync(embed, 'utf8');
    expect(html, `embed contains #${border!.id}`).toContain(`id="${border!.id}"`);
  });
});
