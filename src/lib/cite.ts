/**
 * Citation export (ATLAS-1104 / KAN-79). Pure, dependency-free formatters that
 * turn a map into BibTeX / RIS / Chicago strings. Kept deliberately free of any
 * `astro:content` / corpus import so the CiteExport island can import it into a
 * tiny client bundle and build the strings in the browser on demand.
 */

/** The citation-relevant projection of a map (resolved author, canonical URL). */
export interface CiteInput {
  id: string;
  title: string;
  year: number; // negative = BC
  author?: string; // resolved cartographer name
  publisher?: string;
  place?: string; // region / place of making
  url?: string; // canonical detail URL
}

export type CiteFormat = 'bibtex' | 'ris' | 'chicago';

/** Human year label; negative years render as "600 BC", positive as "1569". */
function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `${year}`;
}

/** BibTeX brace-escaping for field values. */
function tex(s: string): string {
  return s.replace(/[{}]/g, '\\$&');
}

export function toBibTeX(m: CiteInput): string {
  const lines: string[] = [`@misc{${m.id},`];
  const field = (key: string, value?: string) => {
    if (value) lines.push(`  ${key.padEnd(12)}= {${tex(value)}},`);
  };
  field('title', m.title);
  field('author', m.author);
  field('year', yearLabel(m.year));
  field('address', m.place);
  field('publisher', m.publisher);
  if (m.url) lines.push(`  ${'howpublished'.padEnd(12)}= {\\url{${m.url}}},`);
  lines.push(`  ${'note'.padEnd(12)}= {Historical map. Terra Chartarum.}`);
  lines.push('}');
  return lines.join('\n');
}

export function toRIS(m: CiteInput): string {
  const lines: string[] = ['TY  - MAP'];
  const tag = (key: string, value?: string) => {
    if (value) lines.push(`${key}  - ${value}`);
  };
  tag('TI', m.title);
  tag('AU', m.author);
  tag('PY', yearLabel(m.year));
  tag('CY', m.place);
  tag('PB', m.publisher);
  tag('UR', m.url);
  lines.push('ER  - ');
  return lines.join('\n');
}

export function toChicago(m: CiteInput): string {
  const parts: string[] = [];
  if (m.author) parts.push(`${m.author}.`);
  parts.push(`${m.title}.`);
  const imprint = [m.place, m.publisher].filter(Boolean).join(': ');
  const tail = [imprint, yearLabel(m.year)].filter(Boolean).join(', ');
  if (tail) parts.push(`${tail}.`);
  if (m.url) parts.push(`${m.url}.`);
  return parts.join(' ');
}

export function formatCitation(m: CiteInput, fmt: CiteFormat): string {
  return fmt === 'bibtex' ? toBibTeX(m) : fmt === 'ris' ? toRIS(m) : toChicago(m);
}
