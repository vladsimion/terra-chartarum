/**
 * Handbook section table (ATLAS-1215 / KAN-411).
 *
 * Lives in its own module because Astro hoists `getStaticPaths` out of component
 * scope: a route table defined in page frontmatter is not visible to it. Keeping
 * it here also means the landing page, the breadcrumbs and the section indexes
 * all read the same list rather than three copies of it.
 */
import type { HandbookDocType } from './handbook';

export interface HandbookSection {
  /** Path segment under `/atlas/handbook/`. */
  path: string;
  title: string;
  docType: HandbookDocType;
  blurb: string;
}

export const HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    path: 'layers',
    title: 'Layer catalogue',
    docType: 'layer',
    blurb:
      'One record per documented layer: what it claims, what it rests on, and how much of it was drawn rather than found.',
  },
  {
    path: 'methods',
    title: 'Methods',
    docType: 'method',
    blurb:
      'How a family of reconstructions was made. Written once and referenced by the layers that use it, so one method never becomes several competing accounts of itself.',
  },
  {
    path: 'evidence',
    title: 'Sources and evidence',
    docType: 'evidence',
    blurb:
      'Ledgers of instruments, witnesses and authorities, with the interpretation and confidence each claim carries.',
  },
  {
    path: 'data-fields',
    title: 'Data fields',
    docType: 'data-fields',
    blurb:
      'What each field means and which values it accepts - for reading the map closely and for reusing the data honestly.',
  },
  {
    path: 'decisions',
    title: 'Editorial decisions',
    docType: 'editorial-decision',
    blurb: 'Choices that shape what you see on the map, and the reasoning behind them.',
  },
  {
    path: 'technical',
    title: 'Technical and reproducibility',
    docType: 'technical',
    blurb:
      'Pipelines, schemas, release manifests and validators. Nothing here is needed to read the atlas.',
  },
];

export function sectionForDocType(docType: HandbookDocType): HandbookSection | undefined {
  return HANDBOOK_SECTIONS.find((section) => section.docType === docType);
}
