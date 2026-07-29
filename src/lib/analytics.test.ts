import { describe, expect, it } from 'vitest';
import { resolveAnalyticsConfig } from './analytics';

describe('privacy-safe analytics configuration', () => {
  it('is disabled by default', () => {
    expect(resolveAnalyticsConfig({})).toBeNull();
  });

  it('fails closed for partial, unsupported, or insecure configuration', () => {
    expect(resolveAnalyticsConfig({ provider: 'plausible' })).toBeNull();
    expect(
      resolveAnalyticsConfig({
        provider: 'google-analytics',
        scriptSrc: 'https://plausible.io/js/pa-site.js',
        siteDomain: 'example.com',
      }),
    ).toBeNull();
    expect(
      resolveAnalyticsConfig({
        provider: 'plausible',
        scriptSrc: 'http://plausible.io/js/pa-site.js',
        siteDomain: 'example.com',
      }),
    ).toBeNull();
    expect(
      resolveAnalyticsConfig({
        provider: 'plausible',
        scriptSrc: 'https://third-party.invalid/tracker.js',
        siteDomain: 'example.com',
      }),
    ).toBeNull();
  });

  it('accepts only the current Plausible site-specific script shape', () => {
    expect(
      resolveAnalyticsConfig({
        provider: 'plausible',
        scriptSrc: 'https://plausible.io/js/pa-Terra_123.js',
        siteDomain: 'atlas.example.com',
      }),
    ).toEqual({
      provider: 'plausible',
      scriptSrc: 'https://plausible.io/js/pa-Terra_123.js',
      siteDomain: 'atlas.example.com',
    });
  });
});
