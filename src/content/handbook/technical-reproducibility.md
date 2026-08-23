---
id: technical-reproducibility
title: Reproducibility, versioning and file formats
summary: How to get exactly the bytes a page cites, what the version strings mean, and where the schemas and build history live.
docType: technical
pattern: B
programme: atlas
routeSlug: reproducibility
lifecycle: published
lastReviewed: '2026-08-23'
technicalLinks:
  - label: Release manifest
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/public/geo/manifest.json'
  - label: Layer registry
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/src/lib/geo.ts'
  - label: Source catalogue
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/data/geo/catalog.json'
  - label: Geo-layer publication guide
    href: 'https://github.com/vladsimion/terra-chartarum/blob/main/docs/geo-layers.md'
  - label: Repository
    href: 'https://github.com/vladsimion/terra-chartarum'
---

## Who this is for

Anyone checking a claim, reusing the data, or trying to reproduce a figure. None
of it is needed to read the atlas: every layer's historical argument is on its
own page, and this is the machinery underneath.

## Versions identify bytes, not dates

Every published layer carries a version string like `4440ae3946c6`. It is the
first twelve characters of the file's SHA-256, so **the version is a fact about
the content**, not a release number someone chose.

Two consequences worth knowing:

A given versioned URL always returns the same bytes. If the data changes, the
version changes with it, and the old URL is still a different file.

There is no "accessed on" date in our citations, deliberately. An access date
tells you when someone looked, which is a poor substitute for telling you what
they looked at. Release ID and checksum pin it exactly, and two identical builds
produce identical citations.

## The release manifest

`public/geo/manifest.json` is the join between a layer and its file: format,
CRS, geometry types, feature count, byte size, SHA-256, and the content-addressed
URL. The whole set carries a release ID such as `geo-015d45320b25c121`, which
changes whenever any asset does.

To verify a download, hash it and compare with the manifest entry. If they match,
you have the bytes this atlas drew.

## Formats, and why there are several

| Format     | Used for                                         | Why                                                                |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| GeoJSON    | Most layers                                      | Plain text, readable in anything, fine at these sizes.             |
| FlatGeobuf | Larger vector layers such as the Venetian family | Indexed binary, streams by bounding box rather than loading whole. |
| PMTiles    | Reserved for tiled layers                        | Single-file tile archive served by range request, no tile server.  |

All are static files on a CDN. There is no database behind this atlas and no API
to rate-limit: the delivery model is deliberately boring, and the reason it can
stay boring is that catalogue organisation never required a backend.

## Where the schemas are

Field definitions in reader's language are in the data-fields pages for
[Dacia](/atlas/handbook/data-fields/dacia/),
[the Venetian network](/atlas/handbook/data-fields/vmn/) and
[the Hanseatic world](/atlas/handbook/data-fields/hanseatic/). The exact machine
schemas, with column types and compile contracts, stay in the repository - they
answer a different question, and copying them into public prose would mean two
copies drifting apart.

## Reproducing a layer

Every layer is compiled from committed source data by a script in the
repository, and the compile is deterministic: the same inputs produce the same
bytes, which is what makes content addressing meaningful. The publication guide
in the repository documents the pipeline end to end.

## What is not here

Governance and planning material - tickets, specifications, delivery decisions -
lives in the project's Confluence and Jira and is **not** part of any public
reading path. Nothing on this site requires an account to follow. If you ever hit
a login while trying to understand a layer, that is a defect.
