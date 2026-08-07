/**
 * Citation export (ATLAS-1104 / KAN-79). Pure, dependency-free formatters that
 * turn a map, essay or dataset into BibTeX / RIS / Chicago strings. Kept deliberately free of any
 * `astro:content` / corpus import so the CiteExport island can import it into a
 * tiny client bundle and build the strings in the browser on demand.
 */

export type CiteKind = 'map' | 'essay' | 'dataset';

/** The citation-relevant projection of a published resource. */
export interface CiteInput {
  id: string;
  title: string;
  kind?: CiteKind; // omitted for backwards-compatible map citations
  year?: number; // negative = BC
  author?: string;
  publisher?: string;
  place?: string; // region / place of making
  containerTitle?: string;
  version?: string;
  license?: string;
  url?: string; // canonical detail URL
  /**
   * Access details for a content-addressed dataset (KAN-311). The geo release
   * manifest carries no timestamp on purpose - it is reproducible from content
   * alone - so retrieval is pinned by release id and checksum rather than by an
   * "accessed on" date that would differ between two identical builds.
   */
  release?: string;
  checksum?: string;
}

/** The retrieval note shared by every format: how to get exactly this bytes-for-bytes. */
function accessNote(m: CiteInput): string {
  return [m.release ? `Release ${m.release}` : '', m.checksum ? `SHA-256 ${m.checksum}` : '']
    .filter(Boolean)
    .join('; ');
}

export type CiteFormat = 'bibtex' | 'ris' | 'chicago';

/** Human year label; negative years render as "600 BC", positive as "1569". */
function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `${year}`;
}

function kindOf(input: CiteInput): CiteKind {
  return input.kind ?? 'map';
}

function resourceLabel(input: CiteInput): string {
  const labels: Record<CiteKind, string> = {
    map: 'Historical map',
    essay: 'Visual essay',
    dataset: 'Dataset',
  };
  return labels[kindOf(input)];
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
  field('year', m.year === undefined ? undefined : yearLabel(m.year));
  field('address', m.place);
  field('publisher', m.publisher);
  field('journal', m.containerTitle);
  field('version', m.version);
  if (m.url) lines.push(`  ${'howpublished'.padEnd(12)}= {\\url{${m.url}}},`);
  const note = [
    resourceLabel(m),
    m.license ? `Licence: ${m.license}` : '',
    accessNote(m),
    'Terra Chartarum.',
  ]
    .filter(Boolean)
    .join('. ')
    .replace('..', '.');
  lines.push(`  ${'note'.padEnd(12)}= {${note}}`);
  lines.push('}');
  return lines.join('\n');
}

export function toRIS(m: CiteInput): string {
  const risType: Record<CiteKind, string> = { map: 'MAP', essay: 'ELEC', dataset: 'DATA' };
  const lines: string[] = [`TY  - ${risType[kindOf(m)]}`];
  const tag = (key: string, value?: string) => {
    if (value) lines.push(`${key}  - ${value}`);
  };
  tag('TI', m.title);
  tag('AU', m.author);
  tag('PY', m.year === undefined ? undefined : yearLabel(m.year));
  tag('CY', m.place);
  tag('PB', m.publisher);
  tag('T2', m.containerTitle);
  tag('ET', m.version);
  tag('N1', m.license ? `Licence: ${m.license}` : undefined);
  tag('N1', accessNote(m) || undefined);
  tag('UR', m.url);
  lines.push('ER  - ');
  return lines.join('\n');
}

export function toChicago(m: CiteInput): string {
  const parts: string[] = [];
  if (m.author) parts.push(`${m.author}.`);
  parts.push(`${m.title}.`);
  const imprint = [m.place, m.publisher].filter(Boolean).join(': ');
  const tail = [imprint, m.year === undefined ? '' : yearLabel(m.year)].filter(Boolean).join(', ');
  if (tail) parts.push(`${tail}.`);
  if (m.containerTitle) parts.push(`${m.containerTitle}.`);
  if (m.version) parts.push(`Version ${m.version}.`);
  if (m.kind === 'dataset') parts.push('Dataset.');
  if (m.license) parts.push(`${m.license}.`);
  const access = accessNote(m);
  if (access) parts.push(`${access}.`);
  if (m.url) parts.push(`${m.url}.`);
  return parts.join(' ');
}

export function formatCitation(m: CiteInput, fmt: CiteFormat): string {
  return fmt === 'bibtex' ? toBibTeX(m) : fmt === 'ris' ? toRIS(m) : toChicago(m);
}
