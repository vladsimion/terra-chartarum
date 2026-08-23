# Adding a layer, and adding a collection

The end-to-end contributor workflow for the Atlas catalogue (KAN-408). The
delivery mechanics - formats, validation, release - are in
[geo-layer publication](geo-layers.md); this is the sequence and the decisions.

## Before anything: does this want to be a layer?

A layer is a thing a reader can switch on and read a claim from. If what you
have is a single map sheet, it belongs in the corpus. If it is a fact about one
place, it belongs in a gazetteer or a corpus record. A layer earns its place when
there is a _pattern_ to see: an extent, a network, a distribution, a set of
attestations.

## Adding a layer

### 1. Establish the canonical ID and provenance

Pick the ID first and pick it carefully: **it is the public URL, the citation
identifier, the key into the release manifest and the documentation route, and
it does not change**. Renaming one later is a redirect exercise. Lowercase
kebab-case, programme-prefixed where a programme owns it: `dacia-roman-sites`,
`venetian-ports`.

Record where the data comes from before you compile anything. A layer whose
provenance is reconstructed afterwards is a layer whose provenance is a guess.

### 2. Author and validate the asset

Follow [geo-layer publication](geo-layers.md): source record in
`data/geo/catalog.json`, publishable asset in `public/geo/`, then
`npm run geo:manifest` and `npm run geo:validate`.

### 3. Register it, classified

In `src/lib/geo.ts`, with the taxonomy filled in rather than defaulted:

- **`role`** - what kind of claim it makes. `context` frames the map and asserts
  nothing about the past; `historical` reconstructs a past state; `evidence`
  describes a source. Getting this wrong is the most consequential mistake
  available here, and the schema refuses to let a `context` layer carry a
  historical category precisely because of it.
- **`category`** - required for everything except `context`, from the closed
  vocabulary. A new category is a vocabulary decision, not a per-layer choice.
- **`subcategory`** - open. Use it for a programme's own family distinctions.
- **`room`** and **`secondaryRooms`** - the cosmography lens.
- **`tags`** - what someone would type to find this. Include the words the
  sources use and the words a modern reader would use; both are searched.
- **`lifecycle`** - editorial state. **Not** whether the file exists. A layer can
  be `published` with an empty asset if the contract is settled and the data is
  awaiting review.
- **`sortWeight`** - deterministic catalogue order; keep it unique.
- **`facets`** - the fields a reader may filter on. Declaring them here is what
  makes the filter panel appear; no UI change is needed.

### 4. Do not set collection defaults on the layer

`defaultOn` is base-map infrastructure only. Whether a layer should be drawn when
a reader opens a _collection_ is a property of that collection, and lives there.

### 5. Write the public record

A published layer without documentation fails the build - `npm run
handbook:validate` will name it. Follow
[the Handbook authoring workflow](atlas-handbook-authoring.md).

Proportion is allowed. A context layer takes the minimal-context exemption and
owes only its source, its licence and any anachronism warning. A layer making a
historical claim owes the full apparatus: what you are looking at, how to read
it, scope, sources, reconstruction and uncertainty, editorial decisions, data
fields, citation.

The rule that matters most: **evidence and geometry are different claims.** If
the sources establish that something existed but not where its edge ran, say so,
and make the styling show it.

### 6. Validate and verify

```bash
npm run build
```

runs the whole chain: registry integrity, geo release, taxonomy tests, handbook
projection and the release gate. Then check by hand:

- the layer appears under the right theme, room and collections;
- searching a tag finds it;
- the year slider reveals it when it should;
- the inspector shows source, licence and _About & sources_;
- the record's _Open in Atlas_ returns you to a sensible view.

## Adding a collection

A collection is an editorial argument over canonical layer IDs. Declare it in
`src/lib/geo-collections.ts` with `layerIds`, `defaultLayerIds`, a summary that
says what the argument is, and a room.

**`defaultLayerIds` is the composition a reader is shown who asked for nothing in
particular.** Keep it small and legible - two or three layers that state the
argument. Only `published` layers may be defaults, which is what keeps unreviewed
material from being drawn for someone who merely opened a collection.

A temporal override must give both bounds, stay inside the members' envelope and
carry a `temporalNote` explaining the narrowing.

### When not to create one

- **When it duplicates a room or a theme.** Those lenses already exist over the
  same layers; a collection that groups all the boundary layers is a category
  with extra steps.
- **When it has one member.** That is a layer.
- **When its members cannot be drawn.** A collection whose layers have no assets
  is dropped from the catalogue rather than shown as a dead Activate button - so
  it would simply not appear.
- **When the argument is really an essay.** If the grouping needs a paragraph to
  justify it, the paragraph is the work, and the collection is how you point at
  the layers from it.

Adding a collection is registry authoring. It requires no change to the browser,
and if it does, something has been hard-coded that should not have been.

## What the reports will tell you

- `/data/atlas-catalogue.json` - every layer's classification, membership,
  lifecycle, availability and documentation route.
- `/data/handbook-coverage.json` - published layers with no public record. This
  should always be empty.
