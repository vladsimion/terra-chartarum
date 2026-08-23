/**
 * Handbook projection pipeline (ATLAS-1216 / KAN-412).
 *
 * Public pages are a *projection* over material that is already maintained
 * somewhere canonical. Nothing here authors a second copy of prose: a Pattern B
 * record is the canonical reader-facing text and lives in the content
 * collection; a Pattern A record has no body at all and names the repository
 * document whose public sections it renders.
 *
 * The module is pure over injected entries for the same reason the catalogue
 * projection is: it must be testable without an Astro runtime, and the build
 * failing is more useful than a page rendering something it should not.
 */
import GithubSlugger from 'github-slugger';
import {
  HandbookDocSchema,
  handbookRoute,
  isPublishable,
  validateHandbookDocs,
  assertNoGovernanceDependency,
  type HandbookDoc,
  type HandbookValidationContext,
} from './handbook';

/** One entry as the content collection hands it over. */
export interface RawHandbookEntry {
  data: unknown;
  /** Authored body for Pattern B; empty for Pattern A. */
  body: string;
  /** Pattern A only: the file's contents, read by the caller. */
  sourceMarkdown?: string;
}

export interface ProjectedDoc {
  doc: HandbookDoc;
  route: string;
  /** The Markdown the public page renders. */
  body: string;
  /** Deterministic anchors for every heading in the body. */
  headings: { depth: number; text: string; id: string }[];
}

export interface HandbookProjection {
  docs: ProjectedDoc[];
  errors: string[];
  /** Canonical layer ID to public route, for Atlas integration. */
  routes: Record<string, string>;
}

/**
 * Explicit inclusion markers. A Pattern A document that mixes public and
 * internal material wraps what may be published; a document with no markers is
 * published whole, which is only correct where the KAN-409 audit classified it
 * as wholly public or wholly technical.
 */
const PUBLIC_START = '<!-- public:start -->';
const PUBLIC_END = '<!-- public:end -->';

/**
 * Drop a projected document's own top-level heading.
 *
 * A repository document opens with `# Its Title`; the page it becomes already
 * renders that title as the page `h1`. Keeping both would give the page two
 * first-level headings, which is a real problem for anyone navigating by
 * heading rather than by eye.
 */
export function stripLeadingH1(markdown: string): string {
  const lines = markdown.split('\n');
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index += 1;
  if (index < lines.length && /^#\s+\S/.test(lines[index])) {
    lines.splice(index, 1);
  }
  return lines.join('\n').trim();
}

export function extractPublicSections(markdown: string): string {
  if (!markdown.includes(PUBLIC_START)) return markdown.trim();
  const sections: string[] = [];
  let cursor = 0;
  for (;;) {
    const start = markdown.indexOf(PUBLIC_START, cursor);
    if (start === -1) break;
    const end = markdown.indexOf(PUBLIC_END, start);
    if (end === -1) {
      throw new Error('Unclosed public section marker in projected document');
    }
    sections.push(markdown.slice(start + PUBLIC_START.length, end).trim());
    cursor = end + PUBLIC_END.length;
  }
  return sections.join('\n\n');
}

/**
 * Heading anchors.
 *
 * This uses the same slugger the Markdown renderer uses, deliberately: an anchor
 * computed here and an anchor emitted into the HTML have to be the same string,
 * and the only way to guarantee that is to run the same algorithm rather than a
 * lookalike. Inline emphasis and code marks are stripped first, because the
 * renderer slugs the heading's *text*, not its Markdown.
 */
function stripInlineMarks(text: string): string {
  return text.replace(/[`*]/g, '').trim();
}

export function headingId(text: string): string {
  return new GithubSlugger().slug(stripInlineMarks(text));
}

export function collectHeadings(markdown: string): ProjectedDoc['headings'] {
  const headings: ProjectedDoc['headings'] = [];
  const slugger = new GithubSlugger();
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,4})\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    const text = stripInlineMarks(match[2]);
    headings.push({ depth: match[1].length, text, id: slugger.slug(text) });
  }
  return headings;
}

export function projectHandbook(
  entries: RawHandbookEntry[],
  context: HandbookValidationContext,
): HandbookProjection {
  const errors: string[] = [];
  const docs: ProjectedDoc[] = [];
  const parsed: HandbookDoc[] = [];

  for (const entry of entries) {
    const result = HandbookDocSchema.safeParse(entry.data);
    if (!result.success) {
      const id =
        typeof entry.data === 'object' && entry.data && 'id' in entry.data
          ? String((entry.data as { id: unknown }).id)
          : '<unidentified>';
      for (const issue of result.error.issues) {
        errors.push(`Document "${id}": ${issue.message}`);
      }
      continue;
    }
    const doc = result.data;
    parsed.push(doc);

    let body: string;
    if (doc.pattern === 'A') {
      if (entry.sourceMarkdown === undefined) {
        errors.push(`Pattern A document "${doc.id}" has no source document to project`);
        continue;
      }
      if (entry.body.trim() !== '') {
        // A Pattern A record with a body would be the duplicated prose the whole
        // pipeline exists to prevent.
        errors.push(`Pattern A document "${doc.id}" must not author its own body`);
        continue;
      }
      try {
        body = stripLeadingH1(extractPublicSections(entry.sourceMarkdown));
      } catch (error) {
        errors.push(`Document "${doc.id}": ${(error as Error).message}`);
        continue;
      }
    } else {
      if (entry.body.trim() === '') {
        errors.push(`Pattern B document "${doc.id}" has no body`);
        continue;
      }
      body = entry.body.trim();
    }

    docs.push({ doc, route: handbookRoute(doc), body, headings: collectHeadings(body) });
  }

  errors.push(...validateHandbookDocs(parsed, context));
  errors.push(...assertNoGovernanceDependency(parsed));

  const publishable = docs.filter((entry) => isPublishable(entry.doc));
  const routes: Record<string, string> = {};
  for (const entry of publishable) {
    if (entry.doc.docType === 'layer' && entry.doc.layerId) {
      routes[entry.doc.layerId] = entry.route;
    }
  }

  return { docs: publishable, errors, routes };
}

export interface CoverageRow {
  layerId: string;
  documented: boolean;
  route?: string;
  minimalContext: boolean;
}

/**
 * The report KAN-418 re-runs: which published layers still have no public
 * documentation record. A layer that makes no historical claim is exempt, and
 * the exemption is recorded rather than assumed.
 */
export function handbookCoverage(
  layers: { id: string; role: string; lifecycle: string }[],
  projection: HandbookProjection,
): { rows: CoverageRow[]; undocumented: string[] } {
  const byLayer = new Map(
    projection.docs
      .filter((entry) => entry.doc.docType === 'layer' && entry.doc.layerId)
      .map((entry) => [entry.doc.layerId!, entry]),
  );
  const rows = layers
    .filter((layer) => layer.lifecycle === 'published' || layer.lifecycle === 'in-review')
    .map((layer) => {
      const entry = byLayer.get(layer.id);
      return {
        layerId: layer.id,
        documented: Boolean(entry),
        route: entry?.route,
        minimalContext: entry?.doc.minimalContext ?? false,
      };
    });
  return {
    rows,
    undocumented: rows.filter((row) => !row.documented).map((row) => row.layerId),
  };
}
