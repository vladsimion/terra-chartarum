# TERRA SIGILLATA · LAPIDARIVM DACICVM
### The Trench & The Museum of Dacian Cartography

A unified, self-contained interactive single-file digital exhibition spanning nineteen centuries of cartographic history of Dacia and Romania. The concept treats maps above the ground line as epigraphic inscriptions displayed in a museum wing, and below the ground line as archaeological strata excavated in a trench. One year of history is scaled precisely to one millimetre of physical earth depth.

---

## 🏛️ Spatial Architecture: One Building, Two Wings

The application is structured visually and conceptually as a vertical section drawing split by a central ground line representing `±0.00 m - NIVEAVS SOLI`.

### 1. Light Wing: The Lapidarium (`#museum`)
* **Concept:** Maps as limestone, travertine, or marble stelae mounted on walls.
* **Analytical Instrument:** **Sex Lectiones (The Six Readings)**, adapted from classical epigraphic Leiden conventions to analyze the administrative and graphical mechanics of maps:
  1. `‖` **ORDINATIO** - The geometric armature (projection, graticule, scale).
  2. `A·B` **LITTERAE** - Letterforms and toponymy (who names the land, in what tongue).
  3. `[ ]` **RESTITVTIO** - Restored or inherited content (the copying chain).
  4. `⟨ ⟩` **CORRECTIO** - Instrumental correction (what was verified, measured, or improved).
  5. `⟦ ⟧` **RASVRA** - Erasure (censorship, classifications, structural omissions).
  6. `vac.` **VACAT** - Deliberate blank space (terra incognita, administrative voids).
* **Interactive Tool:** **Collatio (The Comparison Desk)** - An interactive script engine allowing visitors to select any two stelae side-by-side to cross-examine their Six Readings, automatically calculating and explaining the absolute divergence value (`Δ`).

### 2. Dark Wing: The Excavation (`#trench`)
* **Concept:** Earth-bound exploration through stratigraphic excavation down to bedrock layer (`-187.6 cm`).
* **Analytical Instrument:** **Quinque Sigilla (The Five Seals)**, measuring field qualities scored systematically from 0 to 5 in half-points:
  * `M` **MENSVRA** - Measurement accuracy (from symbolic topography to geodetic triangulation).
  * `A` **AVCTORITAS** - Political power and imperial/state mechanics driving the execution.
  * `N` **NOMINA** - Toponymic density and cross-linguistic layering.
  * `L` **LIMES** - Hardness and survey definition of borders and military frontiers.
  * `S` **SILENTIVM** - Strategic or technical silences and missing data blocks.
* **Interactive Tools:**
  * **Sectio (Section Comparison)** - A dynamically generated **SVG Radar/Pentagon Chart** that overlays the Five-Seal profiles of any two layers, outputting calculated qualitative deltas.
  * **Sondaje (The Test Pits)** - Deep-bore vertical drill cores on four specific modern geographical toponyms (**Sarmizegetusa, Apulum, Napoca, Drobeta**), tracking how their naming conventions, spellings, and scripts morph, disappear, or shift across 19 centuries.
  * **Core-Sample Sticky Column** - A continuous scrolling sidebar navigator mirroring the physical soil profile of the trench, utilizing a scroll-spy HUD to feed alive data tracking exact depth and estimated timeline years.

---

## 📊 The Core Corpus: The Thirteen Strata

| Stela | Stratum | Map Identifier | Projected Depth | Central Historic Horizon & Concept |
|:---:|:---:|:---|:---:|:---|
| **I** | **XII** | **Ptolemy · Geographia III.8** | `-187.6 cm` | c. A.D. 150. Dacia parsed purely as text coordinates; 44 towns inside Greek dress. |
| **II** | **XI** | **Tabula Peutingeriana** | `-167.6 cm` | c. A.D. 350. The *cursus publicus* compressed onto a 4-finger tall topological parchment ribbon. |
| **III** | **X** | **Hereford Mappa Mundi** | `-72.6 cm` | c. A.D. 1300. Theological schema. Dacia shifts to Scandinavia; local space filed under ghosts. |
| **IV** | **IX** | **Pietro Vesconte Portolan** | `-71.5 cm` | A.D. 1311. Coastline maritime precision wrapped around an completely unasked inland void. |
| **V** | **VIII** | **Honterus · Chorographia** | `-49.4 cm` | A.D. 1532. First domestic woodcut of Transylvania; a trilingual walled garden profile. |
| **VI** | **VII** | **Ortelius · Parergon** | `-43.1 cm` | A.D. 1595. Antiquarian reconstruction layout mapping current geometry over 2nd-century data. |
| **VII** | **VI** | **Cantacuzino · Wallachia** | `-32.6 cm` | A.D. 1700. Local administrative knowledge mapping 500+ items using a Greek letter casing veil. |
| **VIII** | **V** | **Cantemir · Moldavia** | `-28.9 cm` | A.D. 1716. A dense cartography of memory printed in Amsterdam exile 14 years after death. |
| **IX** | **IV** | **Iosephina (Habsburg Survey)** | `-25.5 cm` | A.D. 1769–73. Regularized 1:28,800 plane-table military sheets. Accuracy and total secrecy. |
| **X** | **III** | **Russian General Staff Map** | `-19.1 cm` | A.D. 1835. The first geodetic network lattice framework establishing structural residuals. |
| **XI** | **II** | **Szathmári · Charta României** | `-16.2 cm` | A.D. 1864. Transition point: ROMÂNIA appears officially printed in clean Latin typefaces. |
| **XII** | **I** | **The Secret Century** | `-11.0 cm` | A.D. 1916–1959. Planuri Directoare & Stereo 70. Precision maps locked away; false maps sold. |
| **XIII** | **0** | **The Present Survey** | `0.0 cm` | A.D. 2026. Continuous digital feeds (WGS84, Sentinel, OSM). Left rough for upcoming iterations. |

---

## 🎨 Visual Identity & Frontend Architecture

The codebase leverages a specialized typographic hierarchy and layout system engineered for high fidelity without reliance on framework dependencies:

* **Color Archetypes:** Divided into a dual-mode palette context. The Light wing mimics travertine slabs and ancient plasters (`#cdc2ab`, `#ddd5c4`, `#e3ddd0`) with minium ink accents (`#9e3b2b`). The Dark wing shifts to deep carbon earth tones (`#171109`, `#241a10`), highlighted with color anchors (`#c9962e` for Mensvra, `#6f9e8a` for Nomina).
* **Typography Core:** Embedded via Google Fonts linking **Cinzel** (carved capitals display), **EB Garamond** (literary, academic body prose), and **IBM Plex Mono** (technical indicators, coordinates, data parameters).
* **Squeeze View Functionality:** Integrated JavaScript method executing inverted contrast treatments (`filter: invert(.92) hue-rotate(180deg)`) on modern SVG layouts to mimic paper-rubbed epigraphic squeezes (*estampaj/calc*).
* **Performance Design:** Zero external dependencies or JS framework overhead. Employs Vanilla ECMA native code structures using a performance-tuned `IntersectionObserver` pattern to fire asynchronous UI gauge animations and fluid native scroll-spies.

---

## 🛠️ Deployment and Execution

1. Save the source text compilation directly into a single container format file: `terra-sigillata-lapidarium.html`.
2. Launch native files inside any standard modern browser viewport engine. No compiler tools, asset paths, node packings, or server frameworks required.
