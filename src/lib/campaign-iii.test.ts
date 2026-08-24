import { describe, expect, it } from 'vitest';
import {
  campaignIIIHolds,
  campaignIIIReleaseReady,
  getBorroczynLayers,
  getBorroczynPackage,
  getInManibusPackage,
} from './campaign-iii';

describe('Dacia Campaign III release state', () => {
  it('keeps the three evidence layers distinct', () => {
    expect(getBorroczynLayers().map((layer) => layer.role)).toEqual([
      'historical_source',
      'georeferenced_derived',
      'modern_reference',
    ]);
  });

  it('does not release a seam without measured georeferencing', () => {
    const seam = getBorroczynPackage();
    expect(seam.status).toBe('blocked_pending_witness');
    expect(seam.controlPoints).toHaveLength(0);
    expect(seam.residualMetrics.rmse).toBeNull();
    expect(seam.publicReady).toBe(false);
  });

  it('does not invent physically inspected objects', () => {
    const objects = getInManibusPackage();
    expect(objects.status).toBe('pending_physical_inspection');
    expect(objects.counts.objects).toBe(0);
    expect(objects.counts.evidence).toBe(0);
  });

  it('reports every active hold', () => {
    expect(campaignIIIReleaseReady()).toBe(false);
    expect(campaignIIIHolds()).toHaveLength(3);
  });
});
