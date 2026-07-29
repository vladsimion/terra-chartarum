import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const shared = ['RadarChart', 'AdaptiveTimeline', 'CompareSlider', 'Scrollytelling'];

describe('shared component starter integration (KAN-217)', () => {
  it('renders every shared interactive pattern in the worked MDX essay', async () => {
    const sample = await readFile(
      join(process.cwd(), 'src', 'content', 'essays', 'starter-example.mdx'),
      'utf8',
    );
    for (const component of shared) {
      expect(sample).toContain(`import ${component} from`);
      expect(sample).toContain(`<${component}`);
    }
  });

  it('keeps the starter template and author guide aligned with the inventory', async () => {
    const [template, guide] = await Promise.all([
      readFile(join(process.cwd(), 'starter', 'essay.mdx.template'), 'utf8'),
      readFile(join(process.cwd(), 'starter', 'README.md'), 'utf8'),
    ]);
    for (const component of shared) {
      expect(template).toContain(`import ${component} from`);
      expect(guide).toContain(`\`${component}\``);
    }
  });
});
