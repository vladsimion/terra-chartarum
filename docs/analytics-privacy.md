# Analytics and privacy

Date: 2026-07-29

Parent: KAN-55

Implementation: KAN-265–269

## Decision

Analytics is optional, build-time configured and disabled by default. The only
supported provider is Plausible Analytics using the current site-specific
`pa-*.js` snippet supplied in the Plausible Site Installation screen.

The integration enables aggregate pageviews and explicitly leaves enhanced
measurements off:

- no localhost capture;
- no file-download tracking;
- no outbound-link tracking;
- no form-submission tracking;
- no custom properties;
- no hash-based route capture.

Plausible's current documentation states that the service uses no cookies or
persistent identifiers and collects no personal data. Its optional measurement
documentation confirms that enhanced measurements are off by default. Sources:

- https://plausible.io/docs/plausible-script
- https://plausible.io/docs/script-extensions
- https://plausible.io/privacy-focused-web-analytics
- https://plausible.io/compliance

This is an implementation decision, not a timeless legal conclusion. A provider,
feature, storage or regulatory change triggers a new privacy review.

## Enable

1. Create the production site in Plausible.
2. Copy its exact site-specific script URL from Site Installation. Current URLs
   have the form `https://plausible.io/js/pa-XXXXX.js`; do not invent the ID.
3. Configure the production build:

```sh
PUBLIC_ANALYTICS_PROVIDER=plausible
PUBLIC_PLAUSIBLE_SCRIPT_SRC=https://plausible.io/js/pa-XXXXX.js
PUBLIC_PLAUSIBLE_DOMAIN=terra-chartarum.pages.dev
```

4. Build and verify:

```sh
npm run build
npm run analytics:validate -- --expect=enabled
```

The three variables are one gate. Missing, partial, unsupported, insecure or
non-Plausible values fail closed and emit no analytics markup.

## Disable

Remove all three `PUBLIC_` analytics variables and rebuild:

```sh
npm run build
npm run analytics:validate -- --expect=disabled
```

Because the site is static, disabling requires a new deployment; it does not
depend on a runtime flag.

## Consent decision

The selected pageview-only configuration does not set analytics cookies. The
provider states that it does not require an analytics cookie-consent banner.
Terra Chartarum therefore publishes a durable `/privacy/` disclosure instead
of a banner that asks for consent to storage the integration does not use.

Add a consent control before enabling any future feature that introduces
cookies, persistent identifiers, personal data, sensitive custom properties or
a provider whose legal basis requires opt-in. Hold the release while that
decision is unresolved.

## Staging verification — KAN-268

Run both builds. They do not contact Plausible during compilation; they inspect
the emitted static HTML.

Disabled:

```sh
npm run build
npm run analytics:validate -- --expect=disabled
```

Enabled with the actual staging site snippet:

```sh
PUBLIC_ANALYTICS_PROVIDER=plausible \
PUBLIC_PLAUSIBLE_SCRIPT_SRC=https://plausible.io/js/pa-XXXXX.js \
PUBLIC_PLAUSIBLE_DOMAIN=staging.example.org \
npm run build
npm run analytics:validate -- --expect=enabled
```

Then open staging browser developer tools:

1. confirm one `pa-*.js` request and one pageview request;
2. confirm no analytics cookies or local-storage entries;
3. navigate through an Astro view transition and confirm one new pageview;
4. confirm localhost and an unconfigured preview contain no script;
5. confirm outbound links, downloads and forms create no extra events.

Do not record a provider-site ID, account token or dashboard credential in the
repository.
