import { describe, expect, it } from 'vitest';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeProseTables from './rehype-prose-tables';
import { renderHandbookMarkdown } from './handbook-render';

const processor = await createMarkdownProcessor({
  gfm: true,
  rehypePlugins: [rehypeProseTables],
});

const render = async (markdown: string) => (await processor.render(markdown)).code;

const TABLE = ['| A | B |', '| - | - |', '| 1 | 2 |'].join('\n');

describe('rehypeProseTables', () => {
  it('wraps an authored table in a keyboard-reachable scroll region', async () => {
    const html = await render(`## Readings\n\n${TABLE}\n`);

    expect(html).toContain(
      '<div class="prose-table" tabindex="0" role="region" aria-label="Readings">',
    );
    // The table itself is untouched: the columns are the argument, so nothing
    // is stacked, dropped or re-tagged on the way through.
    expect(html).toContain('<table><thead><tr><th>A</th><th>B</th></tr></thead>');
  });

  it('names each region after the heading it sits under', async () => {
    const html = await render(`## First\n\n${TABLE}\n\n## Second\n\n${TABLE}\n`);

    expect(html).toContain('aria-label="First"');
    expect(html).toContain('aria-label="Second"');
  });

  it('numbers tables that share one heading so no two regions share a name', async () => {
    const html = await render(`## Shared\n\n${TABLE}\n\n${TABLE}\n`);

    expect(html).toContain('aria-label="Shared - table 1"');
    expect(html).toContain('aria-label="Shared - table 2"');
    expect(html).not.toContain('aria-label="Shared"');
  });

  it('falls back to an ordinal when a table sits under no heading', async () => {
    const html = await render(`${TABLE}\n\n${TABLE}\n`);

    expect(html).toContain('aria-label="Table 1"');
    expect(html).toContain('aria-label="Table 2"');
  });

  it('trims a very long heading rather than reading it out whole', async () => {
    const long = 'A'.repeat(120);
    const html = await render(`## ${long}\n\n${TABLE}\n`);

    const label = /aria-label="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(label.length).toBeLessThanOrEqual(80);
    expect(label.endsWith('…')).toBe(true);
  });

  // handbook-render.ts builds its own processor instead of inheriting the one
  // configured in astro.config.mjs, so the wiring is easy to drop and worth
  // pinning: a Handbook table has to behave like an essay's.
  it('reaches Handbook documents, which render through their own processor', async () => {
    const { html } = await renderHandbookMarkdown(`## Layer fields\n\n${TABLE}\n`);

    expect(html).toContain(
      '<div class="prose-table" tabindex="0" role="region" aria-label="Layer fields">',
    );
  });

  it('leaves a document without tables alone', async () => {
    const html = await render('## Plain\n\nNo table here.\n');

    expect(html).not.toContain('prose-table');
  });
});
