/**
 * Wrap every authored Markdown table in a horizontal scroll container (KAN-437).
 *
 * A table's min-content width is set by its longest unbreakable words, and in a
 * 320px viewport - the WCAG 1.4.10 reflow reference width - that is routinely
 * wider than the prose column. dacia's `Collatio` table wanted 324px of
 * min-content in a column about 20px narrower, and because the essay container
 * is `overflow-x: visible` the surplus became a sideways scroll on the *page* -
 * the reflow failure 1.4.10 exists to prevent.
 *
 * 1.4.10 exempts content that needs a two-dimensional layout to keep its
 * meaning, and a data table is the canonical example - reflowing its columns
 * into a stack, or breaking `RESTITVTIO` across two lines to squeeze the
 * measure, destroys the comparison the table is making. So the scroll stays;
 * it just moves off the page and onto the table, where it is one axis at a
 * time and the surrounding prose still reflows normally.
 *
 * A scrollable box must be operable from the keyboard (WCAG 2.1.1), so the
 * wrapper takes `tabindex="0"`, and a focusable box needs a name and a role to
 * announce when it takes focus (4.1.2), so it takes `role="region"` and an
 * `aria-label` drawn from the heading the table sits under. This is the same
 * treatment `colophon.astro` and the Hanseatic components already hand-write
 * around their own tables; authored Markdown had no way to ask for it.
 */

/** Minimal hast/mdast-ish shape - enough to walk and rewrite, no dependency. */
interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Longest name we will build before trimming; keeps announcements bearable. */
const LABEL_MAX = 80;

function textOf(node: Node): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function heading(node: Node): string {
  const text = textOf(node).replace(/\s+/g, ' ').trim();
  return text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1).trimEnd()}…` : text;
}

interface Found {
  parent: Node;
  index: number;
  /** Nearest heading above the table in document order, '' when there is none. */
  under: string;
}

/**
 * Collect tables in document order, each tagged with the heading above it.
 * Collecting before rewriting is what lets a heading that covers two tables
 * number them, rather than naming two regions the same thing.
 */
function collect(root: Node): Found[] {
  const found: Found[] = [];
  let under = '';

  const walk = (node: Node): void => {
    const children = node.children;
    if (!Array.isArray(children)) return;
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (child.type === 'element' && HEADINGS.has(child.tagName ?? '')) {
        under = heading(child);
        continue;
      }
      if (child.type === 'element' && child.tagName === 'table') {
        // Nothing inside a table can be another prose table, so stop here.
        found.push({ parent: node, index, under });
        continue;
      }
      walk(child);
    }
  };

  walk(root);
  return found;
}

/** `aria-label` per table: the heading it sits under, numbered only if shared. */
function labels(found: Found[]): string[] {
  const total = new Map<string, number>();
  for (const table of found) total.set(table.under, (total.get(table.under) ?? 0) + 1);

  const seen = new Map<string, number>();
  return found.map((table, i) => {
    const nth = (seen.get(table.under) ?? 0) + 1;
    seen.set(table.under, nth);
    if (!table.under) return `Table ${i + 1}`;
    return total.get(table.under) === 1 ? table.under : `${table.under} - table ${nth}`;
  });
}

export default function rehypeProseTables() {
  return (tree: Node): void => {
    const found = collect(tree);
    const names = labels(found);

    found.forEach((table, i) => {
      const children = table.parent.children as Node[];
      children[table.index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['prose-table'],
          tabIndex: 0,
          role: 'region',
          'aria-label': names[i],
        },
        children: [children[table.index]],
      };
    });
  };
}
