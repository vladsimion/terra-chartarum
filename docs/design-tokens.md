# Design token reference

The shared visual language of Terra Chartarum lives in
[`src/styles/tokens.css`](../src/styles/tokens.css) as CSS custom properties on
`:root`. The portal shell uses them everywhere; **native essays should reach for
these tokens rather than hard-coding values**, so every piece reads as one
publication. (Legacy essays keep their own interior CSS — see `SPECS.md §1` —
but the shared chrome still references these.)

This page documents what each token is _for_. `tokens.css` is the source of
truth for the actual values; if the two disagree, the stylesheet wins.

## Colour — canvas & ink

| Token         | Role                                                           |
| ------------- | -------------------------------------------------------------- |
| `--canvas`    | Page background — the darkest surface.                         |
| `--panel`     | Raised surfaces (cards, dialogs) one step above the canvas.    |
| `--panel-2`   | A second, slightly warmer raised surface for nested panels.    |
| `--ink`       | Primary text and high-emphasis marks.                          |
| `--ink-muted` | Secondary text, captions, metadata.                            |
| `--gold`      | The house accent — links on hover, focus rings, active states. |
| `--line`      | Hairline borders and rules (a translucent gold).               |

## Colour — semantic

| Token          | Role                                                       |
| -------------- | ---------------------------------------------------------- |
| `--gained`     | The "gain" pole of the argument (radar/delta viz, greens). |
| `--sacrificed` | The "cost" pole — what a map trades away.                  |

These two encode the site's core thesis (every gain in a map exacts a sacrifice);
use them wherever you visualise that trade-off, not as generic success/error.

## Per-essay accent

Each essay carries a distinct identity colour via its `accent` frontmatter field,
surfaced on cards and essay chrome. Slug-scoped defaults live at the bottom of
`tokens.css` (`--accent-<slug>`). Pick an accent that sits in the family — a
muted, humanist tone against the dark canvas — rather than a saturated hue.

## Typography

| Token            | Role                                                |
| ---------------- | --------------------------------------------------- |
| `--font-display` | Titles and display type — Cinzel / IM Fell English. |
| `--font-body`    | Running prose — Crimson Pro / EB Garamond.          |
| `--font-mono`    | Labels, eyebrows, code, metadata — IBM Plex Mono.   |

### Fluid type scale

`--step--1` through `--step-5` are `clamp()`-based fluid sizes that grow with the
viewport. Use the scale rather than fixed `rem`/`px`:

- `--step--1` — fine print, eyebrows, captions.
- `--step-0` — body copy.
- `--step-1` – `--step-2` — subheadings and lede.
- `--step-3` – `--step-5` — page titles and hero display.

## Spacing & layout

| Token         | Role                                                       |
| ------------- | ---------------------------------------------------------- |
| `--shell-max` | Max width of the outer `.shell` container.                 |
| `--prose-max` | Comfortable measure for running prose (~68ch).             |
| `--radius`    | The single corner radius used across cards, inputs, chips. |

## Motion

All motion honours `prefers-reduced-motion` (see `src/styles/global.css`); when
reduced motion is requested, durations collapse to near-zero. Use these shared
tokens so page interactions and view transitions feel like one system.

| Token           | Role                                          |
| --------------- | --------------------------------------------- |
| `--ease-out`    | Entrances and most UI transitions.            |
| `--ease-in-out` | Symmetric moves (view-transition crossfades). |
| `--dur-fast`    | Micro-interactions — hovers, small toggles.   |
| `--dur`         | Default transition/animation duration.        |
| `--dur-slow`    | Deliberate, cinematic moves.                  |

## Using tokens in an essay

Native essays are scoped Astro/MDX; reference tokens directly in `<style>`:

```css
.my-figure {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink);
  font-family: var(--font-body);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.my-figure:hover {
  border-color: var(--gold);
}
```

If you find yourself hard-coding a colour, size, or duration, check whether a
token already expresses it — and if the design genuinely needs a new value,
add it to `tokens.css` so the next essay can reuse it.
