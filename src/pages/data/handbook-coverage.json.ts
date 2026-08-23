/**
 * Handbook coverage report (ATLAS-1216 / KAN-412).
 *
 * The machine-readable answer to "which published layers still have no public
 * documentation". KAN-418 re-runs this as its migration inventory check, and
 * publishing it as data rather than as prose means the gap list cannot quietly
 * fall out of date the way a hand-maintained one would.
 */
import type { APIRoute } from 'astro';
import { loadHandbookCoverage } from '../../lib/handbook-content';

export const GET: APIRoute = async () => {
  const coverage = await loadHandbookCoverage();
  return new Response(
    JSON.stringify(
      {
        generatedFrom: 'src/content/handbook',
        publishedLayers: coverage.rows.length,
        documented: coverage.rows.filter((row) => row.documented).length,
        undocumented: coverage.undocumented,
        rows: coverage.rows,
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/json; charset=utf-8' } },
  );
};
