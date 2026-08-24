/**
 * Markdown rendering for Handbook pages (ATLAS-1215 / KAN-411).
 *
 * Both authoring patterns arrive here as a Markdown string - Pattern B from the
 * content collection, Pattern A projected from a repository document - so both
 * render through one processor and produce the same semantics. Using Astro's own
 * processor rather than a second Markdown library is what keeps a table, a
 * footnote and a heading anchor behaving the same here as in an essay.
 */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeProseTables from './rehype-prose-tables';

type Processor = Awaited<ReturnType<typeof createMarkdownProcessor>>;

let processor: Processor | null = null;

export interface RenderedDocument {
  html: string;
  /** Heading anchors as emitted, for the in-page section navigation. */
  headings: { depth: number; slug: string; text: string }[];
}

export async function renderHandbookMarkdown(body: string): Promise<RenderedDocument> {
  // This processor is built here rather than inherited from astro.config.mjs,
  // so the table wrapper has to be passed in explicitly or a Handbook table
  // would scroll the page where an essay's does not.
  processor ??= await createMarkdownProcessor({
    gfm: true,
    smartypants: true,
    rehypePlugins: [rehypeProseTables],
  });
  const result = await processor.render(body);
  const headings = (result.metadata?.headings ?? []) as RenderedDocument['headings'];
  return { html: result.code, headings: headings.filter((heading) => heading.depth === 2) };
}
