# Umsetzungs-Roadmap mit Arbeitspaketen und Prompts

**Schritt 3 des Roadmap-Prozesses — verbindet Produktdesign und technische Bestandsaufnahme**
**Stand:** 2026-07-19
**Grundlagen:** `docs/feature_roadmap.md` (Produkt/UX), `docs/tech_inventory.md` (Ist-Zustand)
**Arbeitsmodus:** Jedes Arbeitspaket (AP) ist ein eigenständiger, abschließbarer Auftrag. Die Prompts in Abschnitt 5 sind fertig formuliert und werden einzeln an das Umsetzungs-Modell (Sonnet) gegeben.

---

## 1. Getroffene technische Entscheidungen

Diese Entscheidungen folgen direkt aus der Bestandsaufnahme und gelten für alle Arbeitspakete:

1. **Refactoring vor Features.** Die drei Punkte aus `tech_inventory.md` §4.2 (Modularisierung, zentraler State, Jahres-Partitionierung) werden als Phase R vorgezogen. Begründung: Jede der drei neuen Sichten, die Zeitleiste und F6 hängen an demselben Zustand — je später der Umbau, desto mehr muss doppelt gebaut werden.
2. **State-Management: `zustand`** (eine kleine Dependency, kein Redux-Apparat). Begründung: Der `requestAnimationFrame`-Loop und die reine Partikelmathematik müssen State außerhalb von React-Komponenten lesen können; `zustand` kann das ohne Boilerplate. Kamera wird kontrollierter `viewState` (Voraussetzung für F6-Presets).
3. **Renderdaten pro Jahr partitioniert** (`flowmap_{year}.json`, `country_balance_{year}.json`, …) plus eine kleine `index.json` (verfügbare Jahre, Commodities, Datenhorizonte je Layer). Frontend lädt lazy pro Jahr und cacht. Begründung: `tech_inventory.md` §2.3 — die Singleton-Datei skaliert nicht.
4. **BACI-Zeitreihe über die HS92-Ausgabe** (ein einziges Klassifikationssystem für 1995–2023) statt Mapping über vier HS-Revisionen. Zusätzlich wird der Korrektheitsfehler in `get_included_code_map()` behoben (Mapping muss nach System+Version+Code schlüsseln). Begründung: `tech_inventory.md` Risiko 1 — HS92 eliminiert den Revisionsbruch für die Zeitreihe komplett; der Code-Fix schützt trotzdem vor stillen Falschzuordnungen.
5. **Natural-Earth-GeoJSON wird lokal vendored** (einmal heruntergeladen, committed, versioniert) und über eine explizite Brückentabelle `ISO_A3 → country_id` an die Pipeline gebunden. Begründung: Risiko 4 — externe ungepinnte URL + Namensabgleich sind Reproduzierbarkeits- und Korrektheitsrisiken.
6. **Bilanz-Sicht zuerst als Choropleth**, Säulen später optional. Begründung: Ländermap + GPU-Picking existieren; Choropleth ist der billigste Weg zum Kernbild.
7. **Einheiten-Politik für neue Datenquellen:** Rohwert + native Einheit werden immer mitgespeichert; Umrechnung nach Tonnen erfolgt explizit über die `units`-Tabelle mit dokumentierten Faktoren (Öl: bbl/t, Gas: bcm→t, Energie: EJ→t SKE nur wo nötig). Keine stillen Umrechnungen.
8. **Keine Netzwerkzugriffe in der Pipeline.** Alle Quelldaten liegen als dokumentierte Downloads unter `data/raw/<quelle>/` (URL + Version + Abrufdatum in `docs/data_sources.md`). Downloads macht der User oder ein separates, klar gekennzeichnetes Download-Skript.
9. **Frontend-Tests mit Vitest** werden mit AP-R1 eingeführt (die ausgelagerte Geometrie-/Partikelmathematik ist rein funktional und trivial testbar). Pipeline-Tests werden auf Seed-Daten lauffähig gemacht (heute hängen sie an der 301-MB-Zip, `tech_inventory.md` §3.4).

---

## 2. Arbeitspaket-Übersicht

| AP | Titel | Hängt ab von | Ebene |
|---|---|---|---|
| R1 | Frontend-Modularisierung (ohne Verhaltensänderung) + Vitest | — | Frontend |
| R2 | Zentraler App-State + kontrollierte Kamera | R1 | Frontend |
| R3 | Renderdaten pro Jahr + `index.json` + Lazy-Load; Tests auf Seed-Daten | R2 (Frontend-Teil) | Pipeline+Frontend |
| R4 | Ländermap-Härtung: vendoren, ISO-Brücke, Klick-Selektion | R2 | Frontend+Referenzdaten |
| F1a | Quellen-Loader-Muster + Energie-Produktionsdaten + `country_balance` | — (parallel zu R möglich) | Pipeline |
| F1b | USGS- und FAOSTAT-Produktionsdaten | F1a | Pipeline |
| F1c | UI-Grundgerüst: Layout-Shell, Commodity-Navigator, Viz-Tuning-Drawer, Sicht-Umschalter | R1, R2 | Frontend |
| F1d | Bilanz-Sicht (Choropleth) + Steckbrief + Land-Fokus | R3, R4, F1a, F1c | Frontend |
| F2a | Zeitleiste v1: Slider, Play, Geschwindigkeit | R3, F1c | Frontend |
| F2b | BACI-HS92-Zeitreihe 1995–2023 + Code-Map-Fix | R3 | Pipeline |
| F2c | A/B-Differenzmodus + Sparklines im Steckbrief | F2a, F2b, F1d | Frontend |
| F3a | Prozessmodell: Daten + Rechenkern (`Sx`) + Tests | F1a | Pipeline |
| F3b | Ketten-Sicht: Stufen-Stepper + Sankey-Panel | F3a, F1d | Frontend |
| F4a | Historische Produktionsdaten Energie (ab ~1900, best effort früher) | F1a | Pipeline |
| F4b | Deep-Time-Leiste, Datenhorizont-Bänder, Zeitraffer | F4a, F2a | Frontend |
| F5 | Abhängigkeits-Overlay + Schock-Sandbox | F1d | Pipeline+Frontend |
| F6 | Presets, Share-Links, Touren, Public-Modus | R2, F1d, F2a | Frontend |

Empfohlene Reihenfolge: **R1 → R2 → R3 → R4 → F1c → F1a → F1d → F2a → F2b → F1b → F2c → F3a → F3b → F4a → F4b → F5 → F6.**
(F1a/F1b sind Pipeline-only und können parallel zu Frontend-APs laufen.)

**Hinweis zur Prompt-Reife:** Die Prompts R1–F2c sind unmittelbar ausführbar. Die Prompts F3a–F6 sind vollständig, sollten aber nach Abschluss von F1/F2 gegen den dann aktuellen Code-Stand kurz nachgeschärft werden (Datei-/Zeilenreferenzen, gewachsene Konventionen).

---

## 3. Konventionen für alle Arbeitspakete

Jeder Prompt setzt diese Regeln implizit voraus; sie stehen als Standard-Präambel in jedem Auftrag:

```text
STANDARD-PRÄAMBEL (gilt für jedes Arbeitspaket):
- Lies zuerst: docs/feature_roadmap.md (Produkt/UX-Spez), docs/tech_inventory.md
  (Ist-Zustand; Zeilenangaben dort sind Stand 2026-07-19 und können nach
  vorherigen Arbeitspaketen abweichen — im Zweifel neu suchen).
- Arbeite auf einem eigenen Branch (ap-<nr>-<kurzname>), committe in sinnvollen
  Schritten mit klaren Messages.
- Verifiziere am Ende: `python3 scripts/build_v01.py` läuft fehlerfrei,
  `python3 -m pytest tests/` (bzw. unittest) grün, `cd web && npm run build`
  fehlerfrei, `npm run dev` startet und die bestehende Visualisierung
  funktioniert ohne Regression (Commodity-Wechsel, Globus, Partikel, Tooltip).
- Bestehende Grundsätze einhalten: Kernmodell → neutrale Renderdaten →
  austauschbare Visualisierung; Rohdaten nie verstümmeln; jede Zahl trägt
  source_dataset + Version; abgeleitete Größen als abgeleitet markieren;
  Inputs negativ / Outputs positiv in Prozesstabellen; alle Mengen in Tonnen,
  native Einheiten dokumentiert mitführen.
- Keine neuen Dependencies außer den im Auftrag genannten.
- Dokumentiere neue Datenquellen in docs/data_sources.md, neue Tabellen in
  docs/schema.md.
```

---

## 4. Phase R — Fundament

### Prompt AP-R1: Frontend-Modularisierung + Vitest

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]

AUFGABE: Zerlege web/src/main.tsx (~1680 Zeilen) in Module — OHNE jede
Verhaltensänderung. Danach: Vitest einrichten und die reine Mathematik testen.

1. Lagere die React-freien Teile in neue Dateien unter web/src/ aus
   (Orientierung: tech_inventory.md §1.1):
   - lib/geometry.ts: sphärische Interpolation, Großkreis, Slerp, Mercator,
     Routenpfade, Antimeridian-Splitting (bisher ca. Z.229–517).
   - lib/particles.ts: buildParticleSeeds, particlePosition, buildParticleFrame,
     Massen-Buchhaltung (bisher ca. Z.543–724).
   - lib/format.ts: formatTonnes, colorToCss, colorSchemeFor, Hash-Helfer.
   - lib/globeGrid.ts: buildGlobeSurfaceCells, buildGlobeGridLines.
   - types.ts erweitern bzw. lib/types.ts: die Typdefinitionen aus main.tsx
     (RenderConfig, ParticleSeed, …) an einen Ort, keine Duplikate mit dem
     bestehenden web/src/types.ts.
   - components/RangeControl.tsx, components/AppErrorBoundary.tsx.
   - components/MapStage.tsx: die MapStage-Komponente unverändert umziehen.
   - main.tsx behält nur noch: App-Komponente, Mount, Imports.
2. Keine Logikänderung, keine Umbenennung von Verhalten, keine "Verbesserungen
   nebenbei". Reines Verschieben + Imports. App-Komponente selbst wird in
   diesem AP noch NICHT zerlegt (das folgt in AP-F1c).
3. Vitest als devDependency einrichten (npm script "test"). Schreibe Unit-Tests
   für lib/geometry.ts und lib/particles.ts, mindestens:
   - Großkreis/Slerp: Endpunkte werden exakt getroffen; Punkte liegen auf der
     Einheitskugel.
   - splitPathAtAntimeridian: ein Pfad über die Datumsgrenze wird in 2 Segmente
     geteilt; ein Pfad ohne Überquerung bleibt ganz.
   - buildParticleSeeds: Partikelbudget wird vollständig verteilt; Massen-
     Summe über alle Partikel eines Flusses entspricht der Flussmenge
     (innerhalb Rundungstoleranz); ein Fluss mit Gewicht 0 bekommt 0 Partikel.
   - particlePosition: Position bei Phase 0 ≈ Start, bei Phase 1 ≈ Ziel.
4. VERIFIKATION zusätzlich zur Präambel: npm test grün; visueller Vergleich
   der Viz vor/nach dem Umbau (gleiche Partikelbilder bei gleichen Defaults).

NICHT TUN: State-Umbau (AP-R2), App-JSX zerlegen (AP-F1c), neue Features.
```

### Prompt AP-R2: Zentraler App-State + kontrollierte Kamera

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R1 abgeschlossen.

AUFGABE: Führe einen zentralen App-State mit zustand ein und mache die Kamera
kontrolliert. Das ist die tragende Wand für alle folgenden Features
(Sichten, Zeitleiste, Land-Fokus, Presets).

1. Dependency: zustand (einzige neue Dependency).
2. Neuer Store web/src/store.ts mit klar getypten Slices:
   - commodity: activeCommodityId, selectedCommodityIds (Mehrfachauswahl wie
     bisher), setter.
   - time: year (Default = aktuell einziges Jahr aus den Renderdaten),
     availableYears (vorerst aus meta befüllt, ab AP-R3 aus index.json).
   - view: activeView ('flows' | 'balance' | 'chain'), Default 'flows'.
     ('balance'/'chain' werden erst in F1d/F3b bedienbar; der State existiert
     ab jetzt.)
   - selection: selectedCountryId | null.
   - camera: viewState (longitude, latitude, zoom, pitch, bearing) +
     setViewState.
   - renderConfig: die bisherigen ~20 Renderparameter (ersetzt den
     useState in App).
   - hover/status wie bisher, sofern sinnvoll zentralisierbar; MapStage-
     interne Modul-Lade-States dürfen lokal bleiben.
3. DeckGL auf kontrollierten viewState umstellen: viewState + onViewStateChange
   aus dem Store. Verhalten muss identisch bleiben (Kamera bleibt bei
   Commodity-/Modus-Wechsel stehen; Zoom-abhängiges Trail-Spacing über
   camera.zoom statt lokalem viewZoom).
4. App und MapStage lesen/schreiben ausschließlich über den Store; Props-
   Durchreichung von State entfällt entsprechend.
5. Der requestAnimationFrame-Loop darf renderTime lokal behalten (Performance);
   er liest Konfiguration über zustand-Selektoren oder getState().
   WICHTIG: Partikel-Rebuild darf nur bei tatsächlicher Änderung von Flüssen/
   Config passieren, nicht pro Frame — bestehende Memoisierung erhalten.
6. VERIFIKATION zusätzlich: Kamera-Position bleibt bei Commodity-Wechsel und
   Rendermode-Wechsel exakt erhalten; ein manueller Test, dass
   store.getState().camera die echte aktuelle Kamera widerspiegelt (z. B.
   per console.log-Knopf oder Vitest für die Store-Logik).

NICHT TUN: UI-Layout ändern, neue Panels, Jahr-Umschaltung (kommt mit R3/F2a).
```

### Prompt AP-R3: Renderdaten pro Jahr + index.json + Lazy-Load; Tests auf Seed-Daten

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R2 abgeschlossen.

AUFGABE: Stelle die Renderdaten-Ausgabe von der Singleton-flowmap.json auf
Jahres-Partitionierung um und bringe dem Frontend Lazy-Loading bei.
Grundlage: tech_inventory.md §2.3 und §3.1.

PIPELINE:
1. configs/datasets.json: target_year (einzelner Wert) wird zu
   target_years (Liste). Abwärtskompatibel einlesen (einzelner Wert = Liste
   mit einem Element).
2. build() iteriert über alle target_years. Die lokale BACI-HS22-Zip enthält
   2022–2024 (tech_inventory.md §2.2) — Standardkonfiguration: [2022, 2023, 2024].
3. Ausgabe je Jahr: data/render/flowmap_{year}.json und
   web/public/render/flowmap_{year}.json (Struktur unverändert).
   Processed-CSVs bekommen eine Jahresspalte oder Jahres-Dateien — wähle die
   Variante, die die bestehenden Abfragen am wenigsten verbiegt, und
   dokumentiere sie in docs/schema.md.
4. Neue Datei data/render/index.json (+ Kopie nach web/public/render/):
   { years: [...], commodities: [...(wie bisher commodities[])],
     layers: { trade: {yearMin, yearMax}, production: null, processes: null },
     generatedAt, sourceVersions }
   Die layers-Einträge sind die späteren Datenhorizonte (F4); production/
   processes bleiben vorerst null.
5. countries.csv nicht mehr bei jedem Lauf überschreiben: nur neu erzeugen,
   wenn die Datei fehlt oder ein explizites Flag gesetzt ist
   (tech_inventory.md §3.1 Punkt 2).
6. Tests: tests/test_pipeline.py so umbauen, dass er gegen die Seed-CSV läuft
   (schnell, ohne 301-MB-Zip lauffähig); ein zusätzlicher, per Marker/Env-Var
   überspringbarer Test läuft gegen die echte Zip, wenn vorhanden. Neuer Test:
   Mehrjahres-Build erzeugt für jedes Jahr eine flowmap_{year}.json und eine
   konsistente index.json.

FRONTEND:
7. Loader-Modul web/src/lib/dataLoader.ts: lädt beim Start nur index.json,
   befüllt store.time.availableYears; lädt flowmap_{year}.json on demand
   (bei Jahreswechsel), cacht geladene Jahre im Speicher, zeigt einen
   dezenten Ladeindikator im UI-Statusbereich.
8. store.time.year-Wechsel tauscht den aktiven Datensatz aus; Partikel werden
   neu geseedet; Kamera und Commodity-Auswahl bleiben unverändert.
   Ein minimaler Jahr-Umschalter (schlichtes Select in der bestehenden
   Sidebar) genügt in diesem AP — die richtige Zeitleiste kommt in AP-F2a.
9. VERIFIKATION zusätzlich: Wechsel 2022 → 2023 → 2024 im UI funktioniert,
   nachgeladene Jahre kommen aus dem Cache (Network-Tab: nur 1 Fetch/Jahr).
```

### Prompt AP-R4: Ländermap-Härtung — vendoren, ISO-Brücke, Klick-Selektion

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R2 abgeschlossen.

AUFGABE: Mache die Ländermap zur belastbaren Grundlage für Choropleth (F1d)
und Selektion. Grundlage: tech_inventory.md §1.3 und Risiko 4.

1. Natural-Earth-110m-Admin-0-GeoJSON einmalig herunterladen und lokal
   vendoren: web/public/geo/ne_110m_admin_0_countries.json. Quelle, Version
   und Abrufdatum in docs/data_sources.md dokumentieren. COUNTRY_GEOJSON_URL
   auf den lokalen Pfad umstellen (kein Laufzeit-Fetch von GitHub mehr).
2. Brückentabelle data/reference/country_geo_map.csv erzeugen:
   Spalten geo_feature_id (ISO_A3 bzw. ADM0_A3 aus den GeoJSON-Properties;
   prüfe die Sonderfälle mit ISO_A3 == '-99', z. B. Frankreich/Norwegen im
   Natural-Earth-Datensatz — dort ADM0_A3 verwenden), country_id (Pipeline-
   ISO3 aus data/reference/countries.csv), match_method, notes.
   Erzeuge sie skriptgestützt (Abgleich beider Listen), liste alle nicht
   gematchten Länder beider Seiten explizit in der Datei bzw. in notes auf —
   kein stilles Verschlucken.
3. Die Brücke in die Renderdaten bringen: flowmap_{year}.json.locations[]
   bzw. index.json.commodities bleiben unverändert; ergänze in index.json
   ein countries[]-Array {countryId, name, geoFeatureId, lat, lon} als
   zentrale Länderreferenz fürs Frontend.
4. Frontend: GeoJsonLayer bekommt onClick → store.selection.selectedCountryId
   (Toggle: erneuter Klick aufs selbe Land oder Klick ins Leere deselektiert).
   Selektiertes Land wird visuell hervorgehoben (z. B. hellere Füllung +
   kräftigere Kontur); die Flüsse des selektierten Landes werden hervorgehoben,
   alle anderen gedimmt (Filterung in der bestehenden Flow-/Partikel-Pipeline
   über origin/dest == selectedCountryId).
5. getFillColor wird datengetrieben vorbereitet: eine Funktion
   countryFillColor(countryId) mit aktuell neutralem Ergebnis + Hervorhebung
   bei Selektion — die Choropleth-Logik selbst kommt in AP-F1d.
   updateTriggers korrekt setzen, damit Selektionwechsel neu einfärbt.
6. Ländermap auch in der flachen Kartenansicht aktivieren, sofern ohne
   größere Verrenkung möglich; sonst dokumentiert Globus-only lassen.
7. VERIFIKATION zusätzlich: Klick auf China hebt Chinas Flüsse hervor und
   dimmt den Rest; Deselektion stellt alles wieder her; App funktioniert
   offline (kein externer Geo-Fetch im Network-Tab).
```

---

## 5. Phase F1 — Bilanz-Sicht

### Prompt AP-F1a: Quellen-Loader-Muster + Energie-Produktionsdaten + country_balance

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: keine (Pipeline-only; Abstimmung mit AP-R3-Dateilayout, falls
schon vorhanden).

AUFGABE: Baue das erste Stück Layer 2: production_sources für die Energie-
Commodities füllen und daraus die Länderbilanz (scheinbarer Inlandsverbrauch)
berechnen. Grundlage: feature_roadmap.md §5 F1, tech_inventory.md §3.2/3.3.

1. Loader-Struktur: src/physical_economy/sources/ als neues Unterpaket.
   Ein Loader pro Datenquelle als eigenes Modul mit einheitlicher Signatur
   (Eingabe: Pfad unter data/raw/<quelle>/ + Config; Ausgabe: Zeilen im
   production_sources-Schema aus PLACEHOLDER_TABLES). Kein Overengineering:
   gemeinsame Helfer für Ländernamen→ISO3-Mapping und Einheitenumrechnung
   reichen als "Interface".
2. Erste Quelle: Energy Institute Statistical Review of World Energy
   (frei verfügbar, CSV-Download; ehemals BP Statistical Review). Der User
   legt die CSV unter data/raw/energy_institute/ ab — schreibe eine kurze
   Download-Anleitung (URL, welche Datei) nach docs/data_sources.md und
   brich mit klarer Fehlermeldung ab, wenn die Datei fehlt.
   Extrahiere je Land und Jahr (alle Jahre, die die Quelle hergibt — das
   ist zugleich Vorarbeit für F4):
   - Kohleproduktion (Achtung: neuere Ausgaben in EJ — zurückrechnen nach
     Tonnen mit dokumentiertem Faktor oder, falls die Quelle Tonnen
     ausweist, direkt; native Einheit immer mitspeichern),
   - Rohölproduktion (Mt bzw. kbbl/d → t/Jahr, Faktor dokumentieren),
   - Erdgasproduktion (bcm → t über dokumentierte Dichte).
   Ländernamen der Quelle → ISO3 über eine explizite Mapping-Tabelle
   data/reference/source_country_map.csv (source, source_name, country_id);
   nicht zuordenbare Zeilen (Aggregate wie 'Total World', 'Other …')
   dokumentiert ausschließen.
3. production_sources.csv wird real befüllt (source_type: energy_extraction,
   unit nativ + quantity in Tonnen gemäß Schema; source_dataset/-version
   gesetzt). commodity_id-Zuordnung: hard_coal, crude_oil, natural_gas
   (gegen data/reference/commodities.csv prüfen).
4. Neue abgeleitete Tabelle data/processed/country_balance.csv:
   year, country_id, commodity_id, production_t, import_t, export_t,
   apparent_use_t (= production + import − export), is_inferred=true,
   method_notes. Import/Export aus trade_flows aggregiert. Nur für
   Commodity+Jahr-Kombinationen mit vorhandener Produktion; Länder mit
   Handel aber ohne Produktionswert bekommen production_t leer (nicht 0!)
   und apparent_use_t leer — fehlende Daten nicht als Null erfinden.
5. Renderausgabe je Jahr: data/render/country_balance_{year}.json
   (+ web/public/render/): { commodityId → [{countryId, production, import,
   export, apparentUse}] } nur für Jahre, in denen sowohl Handels- als auch
   Produktionsdaten existieren. index.json.layers.production mit echtem
   {yearMin, yearMax} befüllen.
6. Tests: Loader-Test mit einem kleinen eingecheckten Fixture-Ausschnitt
   (wenige Zeilen im Quellformat); Bilanz-Test: production+import−export
   stimmt für ein Handbeispiel; Welt-Summentest: Summe production_t je
   Commodity in plausibler Größenordnung (z. B. Rohöl ~4–4,5 Mrd t/Jahr) —
   als Warnung, nicht als harter Fail.
7. docs/schema.md um country_balance erweitern; docs/data_sources.md um die
   Quelle inkl. Lizenzhinweis.

NICHT TUN: UI (AP-F1d), USGS/FAOSTAT (AP-F1b).
```

### Prompt AP-F1b: USGS- und FAOSTAT-Produktionsdaten

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F1a abgeschlossen (Loader-Muster, source_country_map,
country_balance-Pfad existieren).

AUFGABE: Produktionsdaten für Metalle und Agrar ergänzen, gleiches Muster
wie AP-F1a.

1. USGS Mineral Commodity Summaries (Datenfiles der aktuellen Ausgabe,
   CSV/XLSX unter data/raw/usgs/): Minenproduktion je Land für iron_ore,
   copper_ore (Mine production), bauxite, primary_aluminium (Schmelz-
   produktion), sowie phosphate_rock. source_type: mine_extraction bzw.
   industrial_production.
2. FAOSTAT (Bulk-CSV "Production_Crops_Livestock" unter data/raw/faostat/):
   Produktion je Land für wheat, maize, rice, soybeans. Achtung FAOSTAT-
   Ländercodes: über die mitgelieferte Area-Codes-Tabelle nach ISO3 mappen,
   Aggregate (World, Regionen, 'China, mainland' vs. 'China') dokumentiert
   behandeln.
3. Beide Quellen: alle verfügbaren Jahre laden (FAOSTAT ab 1961 — Vorarbeit
   für F4), production_sources und country_balance_{year}.json erweitern,
   index.json.layers.production aktualisieren.
4. Tests analog AP-F1a (Fixtures, Plausibilitäts-Summen: Weizen-Welt ~0,8 Mrd t,
   Kupfer-Minenproduktion ~22 Mio t).
5. Steckbrief-Vorbereitung: kleine Aggregattabelle bzw. Render-JSON
   world_summary_{year}.json je Commodity: {worldProduction, worldTrade,
   tradeShare} — die "Handelsquote" aus feature_roadmap.md F1.
```

### Prompt AP-F1c: UI-Grundgerüst — Layout-Shell, Navigator, Drawer, Sicht-Umschalter

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R1 und AP-R2 abgeschlossen.

AUFGABE: Baue die App-Shell aus feature_roadmap.md §4.2 (ASCII-Layout) —
die Struktur, in die Bilanz-Sicht, Zeitleiste und Panels einziehen.
Die App-Komponente wird dabei endlich in Komponenten zerlegt.

1. Neue Komponenten unter web/src/components/:
   - AppHeader: Titel; Sicht-Umschalter als Segmented Control
     [Ströme | Bilanz | Kette] gebunden an store.view.activeView — 'Bilanz'
     und 'Kette' sind vorerst disabled mit Tooltip ('kommt mit Bilanzdaten'/
     'Prozesskette noch nicht modelliert'); Jahresanzeige; Zahnrad-Button.
   - CommodityNavigator (linke Spalte, einklappbar): Baum Gruppe → Commodity
     aus den Renderdaten/index.json, Suchfeld (einfacher Namensfilter),
     Farbpunkt je Commodity in Gruppen-/Commodityfarbe (identisch zur
     Partikelfarbe), aktive Commodity markiert. Bestehende Mehrfachauswahl-
     Semantik beibehalten; zusätzlich das Konzept 'fokussierte Commodity'
     (genau eine, für Steckbrief/Bilanz) im Store ergänzen, Default = die
     zuletzt angeklickte.
   - ContextPanel (rechte Spalte): vorerst mit den bestehenden Inhalten
     Stats/Legende/Warnhinweis als Platzhalter-Sektionen — der echte
     Steckbrief kommt in AP-F1d.
   - VizTuningDrawer: ALLE bisherigen Render-Regler (~20 RangeControls,
     Modus-Umschalter etc.) ziehen aus der Sidebar in einen über das
     Zahnrad öffnbaren Drawer/Seitenpanel um. Nichts entfernen, nur
     umziehen; Zustand weiter im Store.
   - TimelineBar (untere Leiste): vorerst nur das Jahr-Select aus AP-R3
     hübsch eingebettet (Slider/Play kommt in AP-F2a) — die Leiste als
     Layoutelement existiert ab jetzt.
2. CSS/Layout: Grid gemäß ASCII-Skizze (Header / Nav+Globus+Panel / Timeline),
   Panels einklappbar, Globus bekommt den frei werdenden Platz. Bestehendes
   styles.css erweitern, kein CSS-Framework einführen.
3. App.tsx wird zum reinen Kompositions-Root (Shell + MapStage + Komponenten),
   Ziel deutlich unter 200 Zeilen.
4. VERIFIKATION zusätzlich: alle bisherigen Funktionen (Commodity-Wechsel,
   Renderparameter, Tooltip, Legende, Jahr-Wechsel) erreichbar und
   funktionsfähig; Sicht-Umschalter wechselt store.view.activeView (sichtbar
   z. B. an aktiver Markierung), auch wenn Bilanz/Kette noch leer sind.
```

### Prompt AP-F1d: Bilanz-Sicht (Choropleth) + Steckbrief + Land-Fokus

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R3, AP-R4, AP-F1a (mind. Energie-Daten), AP-F1c.

AUFGABE: Die Bilanz-Sicht und der Commodity-Steckbrief — das Kernbild des
Projekts: Wo entsteht der Stoff, wo verbleibt er, und wie viel davon sieht
man im Handel? Spez: feature_roadmap.md §5 F1.

1. Datenladen: country_balance_{year}.json und world_summary_{year}.json
   über den dataLoader (lazy, gecacht). Sicht-Umschalter 'Bilanz' wird für
   Commodities mit Produktionsdaten aktiv (Prüfung über index.json).
2. Bilanz-Sicht auf dem Globus (activeView === 'balance'):
   - Choropleth über countryFillColor (AP-R4): Toggle
     [Produktion | Verbrauch | Netto] (Netto = Produktion − scheinbarer
     Verbrauch; divergierende Skala Überschuss ↔ Bedarf, sequenzielle Skala
     für Produktion/Verbrauch). Skala wurzel- oder logskaliert wegen
     schiefer Verteilungen; Länder ohne Daten in neutralem Grau, in der
     Legende als 'keine Daten' ausgewiesen.
   - Checkbox 'Ströme einblenden': legt die Handels-Partikel/Bögen gedimmt
     über die Choropleth (Overlay, beide Layer gleichzeitig).
   - Farblegende mit Skalenwerten im ContextPanel oder am Kartenrand.
3. Steckbrief (ContextPanel, global, für die fokussierte Commodity):
   a. Name, Gruppe, Jahr.
   b. Kennzahlen-Kacheln: Weltproduktion [t], Welthandelsmenge [t],
      Handelsquote [%]. Quelle+Jahr als Fußzeile.
   c. Top-5 Produzenten / Exporteure / Importeure als horizontale Balken;
      Klick auf ein Land setzt selection.selectedCountryId.
4. Land-Fokus (ContextPanel bei selectedCountryId, in beiden Sichten):
   a. Landesname, Jahr, Schließen-Button.
   b. Bilanzdarstellung Produktion + Import − Export = scheinbarer Verbrauch
      (Wasserfall oder Balken; fehlende Produktionsdaten explizit als
      'Produktion: keine Daten' — dann keine Verbrauchszahl erfinden).
   c. Top-5 Lieferanten und Abnehmer mit Anteil in % (aus den geladenen
      Flow-Daten des Jahres).
   d. Hinweiszeile bei negativem scheinbaren Verbrauch (Re-Export/Lager/
      Datenartefakt — ehrlich ausweisen).
5. Tooltip in der Bilanz-Sicht: Land, gewählte Größe, Wert, Jahr, Quelle.
6. VERIFIKATION zusätzlich: Für Rohöl zeigt die Bilanz-Sicht plausible
   Bilder (Produktion: Saudi-Arabien/Russland/USA dunkel; Netto: Golfstaaten
   Überschuss, Ostasien/Europa Bedarf); Handelsquote erscheint im Steckbrief;
   Land-Fokus China liefert konsistente Zahlen; Sichtwechsel erhält Kamera,
   Commodity und Jahr.
```

---

## 6. Phase F2 — Zeitachse

### Prompt AP-F2a: Zeitleiste v1 — Slider, Play, Geschwindigkeit

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R3, AP-F1c.

AUFGABE: Die TimelineBar wird zur echten Zeitleiste. Spez:
feature_roadmap.md §5 F2 (ohne A/B-Modus — der kommt in AP-F2c).

1. Slider über store.time.availableYears (aus index.json) mit Jahres-Ticks;
   Ziehen setzt store.time.year (debounced, damit beim Ziehen nicht jedes
   Zwischenjahr geladen wird — Laden erst beim Loslassen bzw. bei kurzem
   Verweilen).
2. Play/Pause-Button + Geschwindigkeitswahl (2 s / 1 s / 0,5 s pro Jahr).
   Play iteriert über die Jahre; bereits geladene Jahre aus dem Cache,
   fehlende werden vorausschauend geladen (Prefetch des nächsten Jahres).
3. Übergänge: Choropleth-Farben und ggf. Balken im Steckbrief weich
   interpolieren (kurze Transition); Partikelströme wechseln pro Jahr hart
   (Neuemission) — keine Vortäuschung unterjähriger Daten.
4. Die Zeitleiste zeigt den Datenhorizont des aktiven Layers dezent an:
   Jahre, für die die aktive Sicht keine Daten hat (z. B. Bilanz vor dem
   ersten Produktionsjahr), sind auf dem Slider ausgegraut/markiert
   (Vorstufe der Deep-Time-Bänder aus F4).
5. VERIFIKATION zusätzlich: Play über alle verfügbaren Jahre läuft flüssig
   (kein Layout-Jank; Jahr-Wechsel nach Erstladen < 1 s wahrgenommen);
   Slider-Ziehen lädt nicht jedes Zwischenjahr (Network-Tab).
```

### Prompt AP-F2b: BACI-HS92-Zeitreihe 1995–2023 + Code-Map-Fix

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R3.

AUFGABE: Die Handels-Zeitreihe. Strategie laut umsetzungs_roadmap.md §1
Punkt 4: BACI in der HS92-Ausgabe (ein Klassifikationssystem, Jahre
1995–2023) statt Revisions-Mapping. Grundlage: tech_inventory.md Risiko 1,
§2.3, §3.3.

1. Korrektheits-Fix zuerst: get_included_code_map() muss nach
   (classification_system, classification_version, code) schlüsseln;
   load_raw_trade_rows() übergibt die Klassifikation der jeweiligen
   Quelldatei. Test: zwei Mappings mit gleichem Code in verschiedenen
   Versionen werden nicht verwechselt.
2. commodity_code_map.csv um HS92-Codes für alle 21 Commodities erweitern
   (classification_version: 1992). Sorgfalt: HS92-6-Steller können von den
   HS22-Codes abweichen; jede Zuordnung mit mapping_confidence und notes
   versehen; im Zweifel Code aufnehmen und Unsicherheit markieren statt
   still weglassen. Die bestehenden HS22-Zeilen bleiben unverändert.
3. configs/datasets.json: mehrere Rohquellen ermöglichen (Liste von
   {path, classification_system, classification_version, years}). Der User
   lädt die BACI-HS92-Zip (CEPII-Download, mehrere GB) nach
   data/raw/baci/ — Download-Hinweis in docs/data_sources.md; die Pipeline
   bricht mit klarer Meldung ab, wenn konfigurierte Quellen fehlen.
4. build() verarbeitet 1995–2023 aus der HS92-Quelle (2022–2024 können
   parallel weiter aus HS22 gebaut werden; bei Jahren, die beide Quellen
   abdecken, hat EINE konfigurierte Quelle Vorrang — dokumentieren).
   Laufzeit beachten: streamende Verarbeitung beibehalten; ein Fortschritts-
   Log pro Jahr.
5. index.json.layers.trade auf den echten Zeitraum erweitern;
   flowmap_{year}.json für alle Jahre erzeugen.
6. Konsistenz-Stichprobe als Test/Skript: für ein Überlappungsjahr
   (z. B. 2022) Weltsummen je Commodity aus HS92- und HS22-Quelle
   vergleichen und Abweichung > 10 % als Warnung ausgeben (Aufschluss über
   Mapping-Qualität).
7. VERIFIKATION zusätzlich: Zeitleiste läuft von 1995 bis zum aktuellsten
   Jahr; Soja-Ströme zeigen über die Jahre den sichtbaren Aufwuchs
   Brasilien/USA → China.
```

### Prompt AP-F2c: A/B-Differenzmodus + Sparklines

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F2a, AP-F2b, AP-F1d.

AUFGABE: Jahresvergleich als Differenzdarstellung auf EINEM Globus
(kein Split-Screen) + Zeitreihen-Miniaturen im Steckbrief. Spez:
feature_roadmap.md §5 F2.

1. A/B-Modus: Button in der TimelineBar aktiviert zwei Jahres-Marker (A, B)
   auf dem Slider. Store: time.compareYear (null = aus).
2. Darstellung im A/B-Modus:
   - Bilanz-Sicht: Choropleth zeigt B−A der gewählten Größe (divergierende
     Skala Wachstum ↔ Rückgang), Tooltip zeigt beide Werte + Delta %.
   - Ströme-Sicht: Flüsse werden nach Veränderung eingefärbt/gewichtet
     (gewachsen vs. geschrumpft vs. neu/verschwunden); wähle eine lesbare
     Umsetzung (z. B. Bogenfarbe nach Vorzeichen der Änderung, Breite nach
     |Delta|) und dokumentiere sie in der Legende.
3. Steckbrief im A/B-Modus: Kennzahlen-Kacheln zeigen A- und B-Wert + Delta.
4. Sparklines (unabhängig vom A/B-Modus): Kennzahlen-Kacheln (Weltproduktion,
   Welthandel, Handelsquote) und Land-Fokus-Bilanz bekommen Mini-Zeitreihen
   über alle verfügbaren Jahre. Dafür eine kleine aggregierte Zeitreihen-
   Datei je Commodity erzeugen (z. B. render/timeseries_{commodityId}.json,
   Weltsummen + Top-Länder), damit nicht alle Jahres-Dateien geladen werden
   müssen — Pipeline-Teil einplanen.
5. VERIFIKATION zusätzlich: A=2013/B=2023 für Sojabohnen zeigt den
   China-Effekt auf einen Blick; A/B aus → normale Ansicht unverändert.
```

---

## 7. Phasen F3–F6 — Prompts (nach F1/F2 gegen den Code-Stand nachschärfen)

### Prompt AP-F3a: Prozessmodell — Daten + Rechenkern + Tests

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F1a. Spez: MVP.md §9 (verbindlich!), feature_roadmap.md §5 F3.

AUFGABE: Der erste echte Transformationslayer — Datenmodell befüllen und den
bislang nicht existierenden Rechenkern bauen (tech_inventory.md Risiko 5).

1. processes + process_flows befüllen (Long Table, Inputs negativ, Outputs
   positiv, flow_role, Referenznormierung — exakt nach MVP.md §9.7):
   - crude_oil_refining: Rohöl → Diesel, Benzin, Kerosin, Naphtha, Schweröl,
     Raffineriegas + Eigenverbrauch/Verluste. Weltdurchschnittlicher
     Produktmix, Quelle dokumentieren (z. B. IEA/EI-Statistiken zum
     Raffinerie-Output-Mix).
   - soybean_crushing: −1,00 Sojabohnen → +0,78 Schrot, +0,18 Öl,
     +0,04 Verluste (MVP.md §9.4).
2. Rechenkern src/physical_economy/transform.py (rein, ohne I/O):
   - Long Table → scipy.sparse Matrix S (Commodities × Prozesse) — NumPy/
     SciPy als neue Dependencies sind hier erlaubt.
   - apply_activity(q, S, x) → q_neu = q + Sx.
   - max_activity(q, S, Prozess): Constraint-Prüfung, wie oft kann ein
     Prozess mit gegebenen Beständen laufen (Minimum-Regel, MVP.md §9.5).
   - infer_activity_from_output(Prozess, Output-Commodity, Menge):
     Aktivität, die eine gegebene Output-Menge erzeugt — inklusive aller
     Co-Produkte im Ergebnis (nie unterschlagen).
3. Anwendung auf Realdaten: für jedes Jahr mit Daten die Welt- (und wo
   Produktionsdaten vorhanden: Länder-)Aktivität der beiden Prozesse
   abschätzen: Rohöl-Raffinationsaktivität aus Rohöl-Verfügbarkeit
   (country_balance), Soja-Crushing aus Sojabohnen-Verfügbarkeit. Ergebnis
   als data/processed/process_activity.csv + Render-JSON
   render/chain_{commodityGroupOderKette}_{year}.json mit den Stufen-Summen
   und dem Sankey-Datensatz (Inputs/Outputs je Prozess, Welt und je Land
   soweit vorhanden). Abgeleitete Größen als inferred markieren.
4. index.json.layers.processes mit Zeitraum + Liste modellierter Ketten
   befüllen (z. B. chains: [{id:'oil', commodityIds:[...], stages:[...]},
   {id:'soy', ...}]).
5. Tests: Matrix-Roundtrip (Long Table → S → Long Table), Catan-Beispiel aus
   MVP.md §9.3 als Testfall (3 Erz + 2 Getreide → 1 Stadt, Aktivität 4),
   Soja-Massenbilanz (Summe Outputs + Verluste = Input), Constraint-Prüfung.
```

### Prompt AP-F3b: Ketten-Sicht — Stufen-Stepper + Sankey-Panel

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F3a, AP-F1d. Spez: feature_roadmap.md §5 F3.

AUFGABE: Die dritte Sicht. activeView 'chain' wird für Commodities aktiv,
die zu einer in index.json deklarierten Kette gehören (Ketten-Icon im
CommodityNavigator; sonst disabled mit Tooltip).

1. Stufen-Stepper oben im Globusbereich (nur in Ketten-Sicht), Stufen aus
   der Kettendefinition, z. B. Öl: [Förderung] → [Rohöl-Handel] →
   [Raffination] → [Produkt-Handel] → [Verbrauch]. Pfeile zwischen Stufen
   tragen Weltsummen in t. Klick auf Stufe:
   - Handelsstufen → Ströme-Darstellung der Stufen-Commodity(s),
   - Förder-/Verbrauchsstufen → Bilanz-Choropleth der Stufen-Commodity,
   - Prozessstufen → Länder-Marker nach Prozessaktivität, sofern
     Länderdaten vorhanden, sonst Hinweis 'nur Weltsumme'.
   Kamera, Jahr, Commodity-Kontext bleiben beim Stufenwechsel erhalten.
2. Sankey-Panel im ContextPanel: Umwandlung der aktiven Prozessstufe
   (Inputs links, Outputs inkl. Co-Produkte/Verluste rechts, Weltsummen;
   bei Land-Fokus Landeswerte, sonst Welt mit Hinweis). Umsetzung als
   schlankes eigenes SVG (keine Chart-Bibliothek einführen) — die Sankeys
   haben < 10 Knoten.
   GRUNDSATZ: Co-Produkte werden IMMER mitgezeigt.
3. Soja-Kette als zweite Kette verfügbar: [Anbau] → [Bohnen-Handel] →
   [Crushing] → [Schrot-/Öl-Handel].
4. VERIFIKATION zusätzlich: Durch die Ölkette klicken fühlt sich an wie
   'dieselbe Welt, nächster Verarbeitungsschritt'; Soja-Sankey zeigt Schrot
   und Öl gemeinsam; Raffinations-Weltsumme in plausibler Größenordnung.
```

### Prompt AP-F4a: Historische Produktionsdaten Energie

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F1a. Spez: feature_roadmap.md §5 F4.

AUFGABE: Deep-Time-Datenlayer — historische Produktion je Land für Kohle
und Öl, so weit zurück wie seriös möglich.

1. Quelle: Our World in Data Fossil-Fuel-/Energy-Datensätze
   (github.com/owid — CSV, basiert auf Statistical Review + Etemad &
   Luciani + Mitchell). Download nach data/raw/owid/, Quelle/Version/
   Abrufdatum dokumentieren. Ziel: Kohle- und Ölproduktion je Land und
   Jahr ab mindestens 1900; frühere Jahre (Kohle ab ~1800 für UK/USA/
   Deutschland u. a.) übernehmen, soweit der Datensatz sie hergibt —
   best effort, keine eigene Archivrecherche.
2. Einheiten: OWID liefert Energieeinheiten (TWh/EJ) — Rückrechnung nach
   Tonnen mit dokumentierten Standardfaktoren; native Werte mitführen.
3. Ländergrenzen-Problematik pragmatisch: heutige ISO3 wo möglich;
   historische Entitäten (UdSSR, Tschechoslowakei, …) als eigene country_id
   mit valid_from/valid_to in countries.csv aufnehmen und NICHT auf heutige
   Länder umverteilen; im Frontend erscheinen sie als eigene Einheiten.
   Methodische Entscheidung in docs/data_sources.md dokumentieren.
4. production_sources um die historischen Jahre erweitern;
   country_balance nur für Jahre mit Handelsdaten (kein Handel vor 1995 —
   keine Scheinbilanzen); index.json.layers.production erweitert die
   Zeiträume je Commodity (Struktur ggf. auf per-Commodity-Horizonte
   verfeinern: layers.production.perCommodity[commodityId] = {yearMin, yearMax}).
5. Tests: Stichproben gegen bekannte Werte (z. B. UK-Kohle ~290 Mt um 1913;
   Welt-Öl ~500 Mt um 1960) als Plausibilitätswarnungen.
```

### Prompt AP-F4b: Deep-Time-Leiste, Datenhorizont-Bänder, Zeitraffer

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F4a, AP-F2a. Spez: feature_roadmap.md §5 F4.

AUFGABE: Die Zeitleiste wird zur Deep-Time-Leiste; Zeitreise als Erlebnis.

1. Zeitskala: zweistufig — Übersichtsband über den vollen Datenzeitraum
   (z. B. 1800–heute) + darüberliegender Zoombereich für Feinauswahl;
   Umschalten/Zoomen per Drag oder Buttons. Bei Commodities ohne
   historische Daten bleibt die bisherige Kurzskala.
2. Datenhorizont-Bänder über/unter dem Slider, je aktivem Layer
   (Produktion / Handel / Prozesse) aus index.json: gefüllt wo Daten,
   punktiert wo keine (Skizze in feature_roadmap.md F4). Fährt der User vor
   den Handelshorizont, blenden Partikelströme sichtbar aus + dezenter
   Hinweis 'vor {jahr} keine bilateralen Handelsdaten — Anzeige: Produktion';
   die Sicht springt in diesem Fall automatisch auf Bilanz/Produktion.
3. Zeitraffer: Play über die volle Historie; große Jahreszahl-Einblendung;
   Produktions-Choropleth entwickelt sich; Geschwindigkeit skaliert
   (z. B. 10 Jahre/s in datenarmen Frühphasen, konfigurierbar).
4. Ereignis-Marker: configs/annotations.json (frei editierbar):
   [{year, label, commodityIds?}] — als dezente Punkte auf der Leiste mit
   Tooltip (Beispiele: 1859 Drake Well, 1973 Ölkrise). Nur Anzeige, keine
   Datenwirkung.
5. CommodityNavigator zeigt die zeitliche Reichweite je Commodity
   (z. B. 'ab 1800').
6. VERIFIKATION zusätzlich: Kohle im Zeitraffer 1800→heute erzählt sichtbar
   UK → USA/Deutschland → China; Horizont-Bänder stimmen mit index.json
   überein; keine Scheindaten vor den Horizonten.
```

### Prompt AP-F5: Abhängigkeits-Overlay + Schock-Sandbox

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-F1d. Spez: feature_roadmap.md §5 F5, MVP.md §10.

AUFGABE: Die nachgelagerten Analysesichten — als Overlay und Panel, nicht
als eigener Einstieg.

1. Abhängigkeits-Overlay (Toggle in der Bilanz-Sicht): Choropleth
   'Importabhängigkeit' (Netto-Import / scheinbarer Verbrauch, nur wo
   Bilanzdaten existieren) und 'Lieferantenkonzentration' (HHI). Die
   Metriken liegen in trade_metrics (tech_inventory.md §3.2) — als
   render/trade_metrics_{year}.json exportieren. Steckbrief/Land-Fokus
   zeigen die Kennzahlen.
2. Schock-Sandbox (Panel, aus Steckbrief oder Land-Fokus aufrufbar):
   a. Eingabe: Exporteur (Land), Commodity, Ausfall-% (Slider 0–100).
   b. Rechnung client-seitig aus den geladenen Flow-Daten (direkte
      Erstrunden-Importlücke je Importeur: Ausfallmenge × Anteil des
      Exporteurs an dessen Importen); Ergebnis als Choropleth 'relative
      Importlücke' + sortierte Liste der Top-Betroffenen (absolut+relativ).
   c. Ausfallende Ströme rot/gestrichelt auf dem Globus.
   d. Wenn für die Commodity eine Prozesskette (F3) existiert: die Lücke
      eine Stufe weiterreichen ('20 % weniger Rohöl → rechnerisch X t
      weniger Raffinerieprodukte'), klar als grobe Abschätzung markiert.
   e. Deutlicher Hinweis im Panel: 'direkte Erstrundeneffekte, keine
      Umlenkung/Substitution'.
3. Persistenz light: shock_scenarios/shock_results_direct-Tabellen aus
   MVP.md §10 NICHT bauen — die Sandbox ist bewusst client-seitig und
   flüchtig; Notiz in docs/schema.md, dass die MVP-Tabellen zugunsten der
   Client-Rechnung zurückgestellt sind.
4. VERIFIKATION zusätzlich: 'Brasilien halbiert Sojaexporte' ist in < 30 s
   vom Gedanken zum Bild; Overlay aus → Bilanz-Sicht unverändert.
```

### Prompt AP-F6: Presets, Share-Links, Touren, Public-Modus

```text
[STANDARD-PRÄAMBEL — siehe docs/umsetzungs_roadmap.md §3]
VORAUSSETZUNG: AP-R2 (kontrollierte Kamera!), AP-F1d, AP-F2a.
Spez: feature_roadmap.md §5 F6.

AUFGABE: Aus dem Werkzeug wird ein herzeigbares Stück — als dünne Schicht
über dem zentralen Store.

1. Preset = serialisierter App-Zustand: {commodity(s), fokussierte Commodity,
   Sicht, Jahr/compareYear, Kamera-viewState, Overlays, Choropleth-Größe,
   ggf. Schock-Szenario, ausgewählte Renderparameter}. Implementierung:
   store.serialize()/hydrate() mit Versionsfeld.
2. Share-Links: Zustand URL-kodiert (Query oder Hash, kompakt); beim Laden
   mit Preset-Parameter wird der Zustand hydratisiert. Kamera fliegt sanft
   zur Zielposition (deck.gl FlyToInterpolator).
3. Preset-Verwaltung: benennen, speichern (localStorage), laden, als Link
   kopieren; JSON-Export/Import für die Ablage im Repo
   (configs/presets/*.json).
4. Touren: configs/tours/*.json — Sequenz aus {preset, title, text};
   Tour-Player-UI: Text-Overlay, Weiter/Zurück, sanfte Kameraflüge zwischen
   Stationen. Eine Beispiel-Tour 'Das Ölzeitalter' (5–8 Stationen) als
   Inhalt anlegen (nutzt Deep-Time, Bilanz, Ströme, Kette).
5. Public-Modus (?mode=public): VizTuningDrawer, Schock-Sandbox und
   Analyse-Overlays ausgeblendet; CommodityNavigator, Sichten, Zeitleiste,
   Touren bleiben. Kein separates Deployment — nur UI-Reduktion.
6. VERIFIKATION zusätzlich: Link kopieren → in neuem Tab öffnen →
   identischer Zustand inkl. Kamera; Tour läuft durch; Public-Modus zeigt
   keine Regler.
```

---

## 8. Pflege dieses Dokuments

- Nach jedem abgeschlossenen AP: Status in der Tabelle in §2 vermerken (z. B. ✅ + Datum + Branch/Commit).
- Vor Start von F3a–F6: Prompt gegen den aktuellen Code-Stand prüfen (Dateipfade, Store-Struktur, index.json-Schema können sich weiterentwickelt haben) und bei Bedarf nachschärfen.
- Erkenntnisse, die Produktentscheidungen berühren (z. B. Choropleth vs. Säulen, Split-Screen doch gewünscht), zurück in `docs/feature_roadmap.md` tragen — die beiden Dokumente bleiben die gemeinsame Wahrheit.
