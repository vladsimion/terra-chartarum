# La Rotta e il Catasto - Venice, Sicily, and Two Ways of Drawing the Same Sea

An interactive, comparative web essay exploring the ideological, political, and cartographic divergence between Venetian and Sicilian historical map-making techniques from 1150 to 1750.

---

## 🗺️ Project Overview

**"Venice drew the sea and left the land blank. Sicily's rulers drew the land and left the sea blank."**

Based on the cartographic theories of **J.B. Harley** (*Maps, Knowledge, and Power*), this project stands as a visual and systemic cross-examination of historical archives. It showcases how maps are not objective reflections of geography, but rather ideological instruments of power, mentality, and governance.

* **La Rotta (The Route - Venice):** Represents a network-oriented, maritime worldview where space is a web of connections, harbor anchorages, and winds to be navigated. 
* **Il Catasto (The Cadastre - Sicily):** Represents a territorial, defensive, and administrative segmentation where space is property to be measured, taxed, managed by foreign rulers, and defended from external threats.

---

## 🛠️ Features Implemented

1. **Interactive Visual Lens (The Mirror / Lo Specchio):** A custom-engineered, range-input-driven structural slider that allows users to overlay and split two custom vector diagrams representing the Venetian Pilot's Chart vs. the Sicilian Viceroy's Survey.
2. **The Four Harley Questions Matrix (Le Quattro Domande):** A comparative grid breakdown exploring structural queries: *Who made it? For whom? For what purpose? What is omitted?*
3. **Dual Historical Dossier Timelines (Il Potere):**
   * **Venetian Chancery:** Explores 1100 years of unbroken, continuous iterative correction by merchant-navigators (*Vesconte, Fra Mauro, Bordone, Agnese, Coronelli*).
   * **Sicilian Strata:** Explores 10 successive foreign regimes (*Byzantines, Arabs, Normans, Aragonese, Spanish Habsburgs, Savoyards, Austrians, Bourbons*) re-mapping the island for tax/garrison purposes and carrying the maps off to foreign archives (*Madrid, Vienna*).
4. **Analytical Radar Instrument (Il Confronto):** An interactive multi-axis matrix scoring engine mapping **22 historical sheets** against 6 structural metrics: `MARE` (Sea detail), `TERRA` (Land detail), `RETE` (Network connectivity), `CONFINE` (Boundaries/Fiefs), `CIRCOLAZIONE` (Freedom of map circulation), and `IMPOSIZIONE` (External state command).
5. **Print-Trade Gallery Proof (Le Stampe):** A comparative study demonstrating that even when independent commercial print shops across Europe (*Basel, Frankfurt, Antwerp, Amsterdam, Paris*) sold maps of both locations to identical audiences, they strictly maintained the structural grammars of their subjects.

---

## 🎨 Design & Aesthetic Language

The interface employs a visually striking, dual-hemisphere layout mirroring its historical thesis:
* **Venetian Sections (Night-Sea Aesthetic):** Dominated by deep lagoon hues (`#0B1D24`), gold leaf accents (`#D2A84B`), and coral nomenclature ink (`#C96A4A`).
* **Sicilian Sections (Noon-Land Aesthetic):** Built upon sun-bleached limestone tones (`#EDE3CC`), architectural ink lines (`#2A2012`), and oxblood/carob boundary accents (`#7C2D1C`).
* **Typography Hierarchy:** Features fluid layout scaling using a premium combination of *Cormorant* (Venetian chancery script), *Marcellus* (Sicilian lapidary inscription style), *Spectral* (highly readable literary body text), and *Spline Sans Mono* (ledger-data elements).

---

## 🔧 Technical Implementation

* **Architecture:** Single-file, client-side application layout written completely in semantic HTML5, localized CSS variables, inline SVG elements, and standard, dependency-free vanilla ECMAScript.
* **Responsive Layout:** Formatted via native layouts (`display: grid` and `display: flex`) adapting from massive desktop viewports to touch-screen mobile devices.
* **Interactions & Animations:** Controlled completely using low-latency `pointermove` inputs mapping coordinates directly to CSS `clip-path` properties for a tactile feel, combined with native asynchronous `IntersectionObserver` elements for smooth view-reveal events.
* **Performance Polish:** Fully compliant with accessibility requirements including high-contrast layouts, `prefers-reduced-motion` fallbacks, safe media fallback listeners, and explicit semantic `aria` tracking.

---

## 📂 Data Corpus & Methodology References

The analysis utilizes data pulled from global archives:
* **Venetian Tradition:** *Biblioteca Nazionale Marciana*, the *Vesconte* portolan corpus, and the *Accademia degli Argonauti* publications.
* **Sicilian Tradition:** *Biblioteca Nacional de España* (Spannocchi's coastal defensive atlas), *Austrian War Archives* (Schmettau's military surveys), and the *Bodleian Library* (Al-Idrisi's regional sheets).
