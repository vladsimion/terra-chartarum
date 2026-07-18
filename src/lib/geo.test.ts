import { describe, it, expect } from 'vitest';
import { GEO_LAYERS } from './geo';

// Locks the atlas registry to the frozen VMN data dictionary (VMN-3) and the
// VMN-2 render findings the VMN-20 styling work delivers.
describe('VMN atlas layers (VMN-20 registry entries)', () => {
  const byId = new Map(GEO_LAYERS.map((l) => [l.id, l]));
  const ids = ['venetian-ports', 'venetian-routes', 'venetian-possessions'];

  it('registers the three FGB layers by their data-dictionary filenames', () => {
    expect(ids.map((id) => byId.get(id)?.url)).toEqual([
      '/geo/venetian-ports.fgb',
      '/geo/venetian-routes.fgb',
      '/geo/venetian-possessions.fgb',
    ]);
    for (const id of ids) expect(byId.get(id)?.format).toBe('flatgeobuf');
  });

  it('drives the slider per feature (phased reveal, blocker B2)', () => {
    for (const id of ids) expect(byId.get(id)?.perFeatureTime).toBe(true);
  });

  it('graduates ports by type and dashes routes by route_type (B3)', () => {
    expect(byId.get('venetian-ports')?.geometry).toBe('circle');
    expect(byId.get('venetian-ports')?.graduate?.field).toBe('type');
    expect(byId.get('venetian-routes')?.geometry).toBe('line');
    expect(byId.get('venetian-routes')?.dash?.field).toBe('route_type');
    expect(byId.get('venetian-possessions')?.geometry).toBe('fill');
  });

  it('replaces the single pending placeholder', () => {
    expect(byId.has('venetian-maritime-1400')).toBe(false);
  });
});
