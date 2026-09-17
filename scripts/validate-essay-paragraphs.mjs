// Sentences split across two paragraphs in essay MDX.
//
// MDX treats a JSX element in block position - line-initial, after a blank line -
// as a block of its own. So this:
//
//     Continue the political comparison in
//
//     <a href="/essays/the-league-that-left-no-map/">The League That Left No Map</a>
//
//     , where the Venetian model is set beside a commercial association.
//
// renders as three paragraphs broken mid-clause, and the reader gets a sentence
// that stops and restarts twice. Prettier is what makes the defect stick:
// .prettierrc.json sets no proseWrap, so the default `preserve` applies and
// `npm run format` re-inserts the blank line in front of block-position JSX.
// Deleting the blank line alone is undone by the next format run. The stable fix
// is to glue the opening tag to the word before it, so no line starts with `<`.
//
// This check therefore flags a paragraph that does not close its sentence when
// the block after it - separated by a blank line - reads as that sentence
// continuing. A continuation on the *next* line is a different construct that
// works correctly (indented bibliography rows inside list items in
// cities-remember.mdx and invisible-maps-trade.mdx), so the blank line is part
// of the rule rather than incidental to it.
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

const ROOT = resolve(import.meta.dirname, '..');
const ESSAYS = resolve(ROOT, 'src/content/essays');

// A sentence that has actually ended, with an optional closing quote or bracket
// after the stop.
const TERMINAL = /[.!?:;](["”’')\]]?)$/u;

// What the next block looks like when it is the rest of the previous sentence.
const CONTINUATION = /^\s*[\p{Ll},;)]/u;

// JSX whose name is a block element is *meant* to stand alone: dacia.mdx sets
// its stela transcriptions as <h4> headings, and both it and the map essays
// carry large inline SVG figures. Neither is a broken sentence, and without
// these two lists they are most of the output.
const BLOCK_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'div',
  'p',
  'section',
  'article',
  'aside',
  'figure',
  'figcaption',
  'ul',
  'ol',
  'li',
  'table',
  'blockquote',
  'hr',
  'pre',
  'details',
  'summary',
  'nav',
]);

const SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'use',
  'image',
  'marker',
  'filter',
  'symbol',
]);

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);

// The prose a block puts on the page. Expressions - `{' '}` and friends - are
// code rather than prose, and must not stand in for the punctuation a sentence
// is missing.
function prose(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type.endsWith('Expression')) return '';
  return (node.children ?? []).map(prose).join('');
}

function isInlineJsx(node) {
  if (node.type !== 'mdxJsxTextElement' && node.type !== 'mdxJsxFlowElement') return false;
  return !BLOCK_TAGS.has(node.name) && !SVG_TAGS.has(node.name);
}

// Does this block read as the remainder of the sentence before it?
function continuesSentence(node) {
  if (isInlineJsx(node)) return true;
  if (node.type !== 'paragraph') return false;
  const first = node.children?.[0];
  if (!first) return false;
  if (isInlineJsx(first)) return true;
  return first.type === 'text' && CONTINUATION.test(first.value);
}

function tail(value, width = 60) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > width ? `...${text.slice(-width)}` : text;
}

function head(value, width = 60) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > width ? `${text.slice(0, width)}...` : text;
}

// Every container holds its blocks in `children`, so one recursive pass over the
// tree covers the root, blockquotes, list items and JSX wrappers alike. Only a
// paragraph can be the unfinished half, which keeps inline children out of it.
function collect(node, file, offences) {
  const children = node.children ?? [];
  for (let index = 0; index + 1 < children.length; index += 1) {
    const [a, b] = [children[index], children[index + 1]];
    if (a.type !== 'paragraph' || !a.position || !b.position) continue;
    // Two lines apart means a blank line between them.
    if (b.position.start.line - a.position.end.line < 2) continue;
    const before = prose(a).trim();
    if (!before || TERMINAL.test(before)) continue;
    if (!continuesSentence(b)) continue;
    offences.push({
      file,
      line: a.position.end.line,
      before,
      after: prose(b).trim(),
    });
  }
  for (const child of children) collect(child, file, offences);
}

const offences = [];
for (const name of readdirSync(ESSAYS)
  .filter((entry) => entry.endsWith('.mdx'))
  .sort()) {
  const path = resolve(ESSAYS, name);
  collect(parser.parse(readFileSync(path, 'utf8')), relative(ROOT, path), offences);
}

// One container's blocks are all compared before the walk descends into them,
// so the hits come out of tree order rather than reading order.
offences.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);

if (offences.length) {
  console.error(
    `Essay paragraph QA failed: ${offences.length} sentence(s) split across a blank line.`,
  );
  console.error('A JSX element that opens a line becomes its own MDX block. Join the opening tag');
  console.error(
    'to the word before it - removing the blank line alone is undone by npm run format.',
  );
  for (const offence of offences) {
    console.error(`- ${offence.file}:${offence.line}`);
    console.error(`    ends:  ${tail(offence.before)}`);
    console.error(`    joins: ${head(offence.after)}`);
  }
  process.exit(1);
}

console.log('Essay paragraph QA passed: no sentences split across a blank line.');
