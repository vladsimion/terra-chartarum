import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';

// The essay page template (src/pages/essays/[slug].astro) renders no title
// heading of its own: a native essay's <h1> comes solely from a top-level
// `# Title` line at the start of its MDX body. Omit it and the built page ships
// with zero <h1> and a document outline that starts at <h2> - which axe's
// WCAG A/AA tag set does not catch, because page-has-heading-one is a
// best-practice rule. Dacia, La Rotta e il Catasto, and three held essays had
// all lost the line, so the invariant is pinned at the source here: it holds for
// held essays too, which build no page for an e2e run to visit.
//
// Legacy essays (.md, status: legacy) are out of scope by construction - their
// heading lives inside the isolated iframe document, not the portal wrapper.

const dir = join(process.cwd(), 'src', 'content', 'essays');

// Fenced code can carry lines that look like headings (a shell comment, a
// Markdown sample), so fences are skipped rather than matched.
function headingsOf(body: string): string[] {
  let fenced = false;
  return body.split('\n').filter((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced && /^# \S/.test(line);
  });
}

const essays = readdirSync(dir)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => {
    const { data, content } = matter(readFileSync(join(dir, file), 'utf8'));
    return {
      file,
      title: String(data.title),
      status: data.status as string,
      h1s: headingsOf(content),
    };
  })
  .filter((essay) => essay.status === 'native');

describe('native essay headings', () => {
  it('covers every native essay in the collection', () => {
    expect(essays.length).toBeGreaterThan(0);
  });

  for (const { file, title, h1s } of essays) {
    it(`${file} opens with exactly one level-1 heading matching its title`, () => {
      expect(h1s).toEqual([`# ${title}`]);
    });
  }
});
