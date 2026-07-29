export const ANALYTICS_PROVIDER = 'plausible' as const;

export interface AnalyticsEnvironment {
  provider?: string;
  scriptSrc?: string;
  siteDomain?: string;
}

export interface PlausibleAnalyticsConfig {
  provider: typeof ANALYTICS_PROVIDER;
  scriptSrc: string;
  siteDomain: string;
}

const PLAUSIBLE_SCRIPT = /^https:\/\/plausible\.io\/js\/pa-[A-Za-z0-9_-]+\.js$/;
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/**
 * Analytics is opt-in at build time. An incomplete or unexpected
 * configuration fails closed so previews and local builds never emit a
 * tracking script accidentally.
 */
export function resolveAnalyticsConfig(
  environment: AnalyticsEnvironment,
): PlausibleAnalyticsConfig | null {
  const provider = environment.provider?.trim();
  const scriptSrc = environment.scriptSrc?.trim();
  const siteDomain = environment.siteDomain?.trim().toLowerCase();

  if (!provider && !scriptSrc && !siteDomain) return null;
  if (provider !== ANALYTICS_PROVIDER) return null;
  if (!scriptSrc || !PLAUSIBLE_SCRIPT.test(scriptSrc)) return null;
  if (!siteDomain || !DOMAIN.test(siteDomain)) return null;

  return { provider, scriptSrc, siteDomain };
}
