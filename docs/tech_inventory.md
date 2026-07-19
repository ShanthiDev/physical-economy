# Technische Bestandsaufnahme

**Stand:** 2026-07-19 (Repo-Zustand: v0.1-Pipeline + drei Partikel/Plume-Iterationen + Globus + Ländermap)
**Zweck:** Ist-Zustand für `docs/feature_roadmap.md`, Abschnitt 6 (offene technische Fragen). Nur Lesezugriff, keine Codeänderungen. Keine Umsetzungsvorschläge für F1–F6 — nur Bestand, Risiken, Refactoring-Empfehlung.

---

## 1. Frontend (`web/`)

### 1.1 Struktur von `web/src/main.tsx` (1682 Zeilen, monolithisch, eine Datei)

Die Datei hat keine interne Modulgrenze außer Funktionsdefinitionen. Grobe Abschnitte:

| Zeilen | Inhalt |
|---|---|
| 1–17 | Imports, globale Konstanten (`MAP_STYLE`, Kamera-Startzustände, `COUNTRY_GEOJSON_URL`, physikalische Konstanten) |
| 18–108 | Typdefinitionen (`RenderConfig`, `ParticleSeed`, `ParticlePoint`, `EndpointPoint`, `RoutePath`, `RouteArc`, `GlobeSurfaceCell`, …) |
| 110–138 | `DEFAULT_RENDER_CONFIG` (20 Renderparameter) + `isParticleRenderMode` |
| 140–227 | Format-/Hash-Hilfsfunktionen (`formatTonnes`, `colorToCss`, `colorSchemeFor`, `buildGlobeSurfaceCells` Z.166–183, `buildGlobeGridLines` Z.185–200) |
| 229–517 | **Eigenständige Geometrie-Bibliothek** ohne React-/deck.gl-Abhängigkeit: sphärische Interpolation, Großkreis, Slerp, Mercator-Projektion, Route-Pfadbau, Antimeridian-Splitting (`splitPathAtAntimeridian` Z.459–489, `buildRoutePaths` Z.491–516) |
| 518–541 | `resolvePickingText` — Tooltip-Auflösung für Hover-Picking über alle Layer-Typen hinweg |
| 543–669 | Partikel-Kern: `buildParticleSeeds` (Z.543–597, Fluss→Partikel-Übersetzung per Gewichtung), `particlePosition` (Z.599–669, Position pro Frame inkl. Plume-Spread, Globus-Slerp, Jitter) |
| 671–724 | `buildParticleFrame`, `particleAllocationWeight`, `estimateParticleMassFromWeight`, `estimateUniformParticleMass` (Massen-Buchhaltung „ein Dot = X Tonnen“) |
| 726–766 | `RangeControl` — wiederverwendbare Slider-UI-Komponente |
| 768–800 | `AppErrorBoundary` — React-Error-Boundary (Klassenkomponente) |
| **802–1203** | **`MapStage`** — die eigentliche deck.gl/react-map-gl-Szene (siehe 1.3/1.4) |
| **1205–1676** | **`App`** — Top-Level-State, Datenladen, gesamte Control-Sidebar-UI (siehe 1.2) |
| 1678–1682 | `createRoot(...).render(...)` Mount |

Es gibt **keine Trennung** zwischen Szenenaufbau, Partikelsystem, UI-Controls und State — alles liegt in zwei React-Komponenten (`MapStage`, `App`) plus einem Modul aus freien Funktionen davor. Die Geometrie-/Partikelmathematik (Z.229–724, ca. 500 Zeilen) ist bereits sauber von React/deck.gl entkoppelt (reine Funktionen, keine Hooks) — das ist die natürlichste Schnittstelle für eine spätere Modul-Trennung. `MapStage` und `App` sind es nicht: Layer-Konstruktion, Datenfilterung und UI-Rendering sind in denselben Funktionskörpern verschränkt (z. B. `App`, Z.1299–1676, ist eine einzige JSX-Rückgabe mit Kopfzeile, Commodity-Select, Render-Tuning-Panel mit ~20 Reglern, Stats, Legende, Tooltip, Warnhinweis — kein Panel ist eine eigene Komponente).

### 1.2 State-Verwaltung

Ausschließlich verstreute `useState`-Hooks, kein zentraler Store, kein Context, kein Reducer, kein URL-Sync:

- `App` (Z.1206–1212): `payload`, `activeCommodity`, `viewMode`, `renderMode`, `renderConfig`, `hoverInfo`, `statusMessage` — 7 unabhängige States.
- `MapStage` (Z.819–832): `mapModules`, `moduleError`, `renderTime`, `viewZoom` — 4 weitere States, lokal zu `MapStage`, `App` sieht sie nicht.

**Kamera-Zustand wird nicht in React gehalten.** `initialViewState` (Z.1195) wird einmalig an `<DeckGL>` übergeben; danach verwaltet deck.gl die Kamera intern (unkontrollierte Komponente). `viewZoom` in `MapStage` wird nur für die Trail-Spacing-Berechnung mitgeführt, nicht als vollständiger Kamerazustand. Effekt: Commodity-/Rendermode-Wechsel setzt die Kamera aktuell **nicht** zurück (passt zufällig schon zur F1–F4-Anforderung „Kamera bleibt erhalten"), aber die App kann die aktuelle Kameraposition weder auslesen noch von außen setzen — für Presets/Share-Links (F6) fehlt dafür ein kontrollierter `viewState` + `onViewStateChange`.

Es existiert kein Konzept für „Jahr" oder „Sicht" (Ströme/Bilanz/Kette) im State — beides muss für F1–F4 neu eingeführt werden.

### 1.3 Ländermap

- Datenquelle: `COUNTRY_GEOJSON_URL` (Z.15) — Natural Earth 110m Admin-0-Countries, geladen zur Laufzeit von `raw.githubusercontent.com` (externe Netzwerkabhängigkeit, keine lokale Kopie, kein Versionspin außer dem Branch `master` des Fremd-Repos).
- Implementiert als `GeoJsonLayer` (`globeCountryLayer`, Z.1040–1062), **nur im Globus-Modus** aktiv (`globeMode`), in der flachen Kartenansicht existiert keine Ländermap.
- Aktuell rein dekorativ: `getFillColor` ist eine **feste** Farbe (Z.1053), keine Choropleth (keine Funktion über Länderdaten). `onHover` (Z.1057–1060) zeigt `properties.NAME` im Tooltip. Es gibt **keinen `onClick`-Handler** im gesamten File (verifiziert) — Klick-Selektion von Ländern ist nicht implementiert.
- Hit-Testing läuft über deck.gl-GPU-Picking (`pickable: true`), das ist polygongenau und würde `onClick` unmittelbar unterstützen — technisch der billigste Teil einer Klick-Selektion.
- Für Choropleth/Klick-Selektion fehlt: (a) ein `onClick`-Handler + Selektions-State, (b) eine Zuordnung Natural-Earth-Ländercode (vermutlich `ISO_A3`/`ADM0_A3`-Property, nicht verifiziert, da die Datei nicht lokal vorliegt) auf die Pipeline-eigene `country_id` (BACI-ISO3), (c) eine datengetriebene `getFillColor`-Funktion. Die Geometrie selbst (110m-Auflösung, 132 im Datensatz vorkommende Länder von ~180 im GeoJSON) ist für eine Weltkarten-Choropleth ausreichend grob/schnell, aber nicht deckungsgleich mit der Pipeline-Länderliste (`data/reference/countries.csv`) — Namensabgleich statt harter ID-Referenz ist ein Fehlerrisiko.

### 1.4 Renderpfad der Partikel

- Fluss → Partikel: `buildParticleSeeds` (Z.543–597) verteilt ein festes globales Partikelbudget (`renderConfig.particleBudget`, Default 20 000, Regler-Bereich 1 000–120 000, Z.1375–1381) proportional zum Flussgewicht (`particleAllocationWeight`, Z.696–699) auf alle sichtbaren Flüsse. Jeder Partikel trägt eine Masse (`massTonnes`, aus `estimateParticleMassFromWeight`), sodass „1 Dot = X Tonnen" gilt (Anzeige in der Legende, Z.1280).
- Pro Frame: `particlePosition` (Z.599–669) berechnet die Position rein funktional aus Phase + Zeit (kein Partikel-State im eigentlichen Sinn, keine Physik-Simulation — alles ist eine geschlossene Funktion von `renderTime`). Ein `requestAnimationFrame`-Loop (Z.868–878) treibt `renderTime`.
- Rendering: **ein** `ScatterplotLayer` für alle Partikel aller Flüsse zusammen (`particleLayer`, Z.1125–1147) — GPU-instanziert, ein Draw Call unabhängig von der Partikelzahl. Das ist der eigentliche Skalierungsgrund, warum 120 000 Partikel im Regler stehen, ohne die Bildwiederholrate strukturell zu gefährden.
- Zusätzlich: `routeLayer`/`globeRouteLayer` (`PathLayer`/`ArcLayer`, je ein Layer für alle Routen) und `endpointLayer` (`ScatterplotLayer`) — ebenfalls je ein Draw Call.
- **Draw-Call-Risiko liegt nicht bei Partikeln, sondern beim Flowmap-Modus:** `flowmapLayers()` (Z.992–1025) erzeugt **einen `FlowmapLayer` pro Commodity** (bis zu 20 im aktuellen Datensatz) — 20 separate deck.gl-Layer/Draw-Calls bei „All commodities". Dieser Modus ist im Globus aber bereits deaktiviert (`effectiveRenderMode` erzwingt `static-arcs`, Z.1269–1272); er existiert nur in der flachen Kartenansicht.
- Harte Grenze im Code: Partikelbudget-Slider-Maximum 120 000 (Z.1376); darüber ist nur durch Codeänderung möglich. Bei Mehrjahres-/Mehr-Commodity-Daten (F2–F4) skaliert die Partikelzahl nicht automatisch mit der Datenmenge — das Budget ist unabhängig von der Anzahl geladener Flüsse, es verteilt nur um.

### 1.5 Abhängigkeiten (`web/package.json`)

```
@deck.gl/core, @deck.gl/layers, @deck.gl/react, @deck.gl/widgets   9.2.0 (mit npm overrides fixiert)
@flowmap.gl/layers                                                  9.2.0
@luma.gl/* (core, engine, shadertools, webgl, constants)            9.2.6 (per overrides erzwungen)
maplibre-gl                                                         ^5.6.0
react, react-dom                                                    ^19.0.0
react-map-gl                                                        ^8.0.0
TypeScript                                                          ^5.8.0, Vite ^7.0.0
```

Alle deck.gl-Pakete sind über `overrides` hart auf `9.2.0`/`9.2.6` gepinnt — vermutlich, weil `@flowmap.gl/layers` gegen eine bestimmte deck.gl-Minor-Version kompiliert wurde und sonst Peer-Dependency-Konflikte entstehen. Das bedeutet: deck.gl-Updates sind nicht trivial „npm update", sondern müssen mit der `@flowmap.gl/layers`-Kompatibilität abgeglichen werden. `main.tsx` lädt die Kartenmodule zur Laufzeit dynamisch (`import(...)`, Z.837–843) statt statisch — das ist bewusstes Code-Splitting, kein Zufall.

Kein State-Management-Paket (Redux/Zustand/Jotai/Router) im Dependency-Baum. Kein Test-Runner für das Frontend (kein Vitest/Jest in `devDependencies`).

---

## 2. Daten & Renderformat

### 2.1 `data/render/flowmap.json` / `web/public/render/flowmap.json` (identisch, 916 KB)

Struktur (aus `build_flowmap_json`, `src/physical_economy/pipeline.py:510–575`):

```
meta:        {title, targetYear, flowMode, unit, rawRows, tradeFlows, netTradeFlows, renderFlows, generatedBy, seedDataWarning}
locations[]: {id, name, lat, lon, region}                              — 132 Länder
flows[]:     {id, origin, dest, count, visualMagnitude, lineWidth,
              commodityMax, commodityId, commodityGroup, color, tooltip, sourceId}  — 1600 Flüsse
commodities[]: {id, name, group, color, maxQuantity}                   — 20 Commodities
```

Für den aktuellen Build (Jahr 2024, `data/processed/build_summary.json`): 81 466 gefilterte Rohzeilen → 78 741 `trade_flows` → 37 280 `net_trade_flows` → **1600 `render_flows`**. Die 1600 kommen aus `configs/visualisation.json:5` (`max_render_flows_per_commodity: 80`) × 20 Commodities mit tatsächlichen Flüssen — `flowmap.json` ist also bereits eine **Top-80-pro-Commodity-Auswahl**, nicht der vollständige Netto-Handelsgraph. `data/processed/net_trade_flows.csv` (die ungekürzte Basis) ist mit 37 280 Zeilen bereits 6,3 MB groß — die Kürzung auf 1600 Flüsse ist der Hauptgrund, warum `flowmap.json` mit 916 KB klein bleibt.

`region` in `locations[].region` ist im aktuellen Datensatz **immer leer** (`data/reference/countries.csv` hat die Spalte, aber sie wird beim BACI-Import nie befüllt, `pipeline.py:242`: `"region": ""`).

### 2.2 Andere `data/processed/*`-Tabellen (Größe für 1 Jahr, 21 Commodities)

| Datei | Zeilen | Größe |
|---|---|---|
| `raw_trade_baci.csv` | 81 466 | 4,6 MB |
| `trade_flows.csv` | 78 741 | 14 MB |
| `net_trade_flows.csv` | 37 280 | 6,3 MB |
| `trade_metrics.csv` | — | 444 KB |
| `production_sources.csv`, `domestic_uses.csv`, `processes.csv`, `process_flows.csv`, `render_particles.csv`, `render_columns.csv` | 0 | nur Header (4 KB) |

Die Rohquelle `data/raw/baci/BACI_HS22_V202601.zip` (301 MB gepackt, im `.gitignore` ausgeschlossen) enthält **drei Jahre** (`BACI_HS22_Y2022_V202601.csv`, `Y2023`, `Y2024`, je 358–379 MB entpackt) in der **HS22-Klassifikation**. Der Loader (`load_raw_trade_rows`, `pipeline.py:255–295`) liest zeilenweise/streamend direkt aus dem Zip-Member und filtert sofort auf die ~60 im `commodity_code_map` enthaltenen HS6-Codes — kein Laden der vollen 360-MB-Datei in den Speicher. Das ist bereits speicherbewusst und skaliert auf die volle BACI-Dateigröße.

### 2.3 Skalierung auf ~20 Jahre × alle Commodities

Zwei getrennte Engpässe:

1. **Klassifikationsbruch:** BACI liegt je nach Jahr in unterschiedlichen HS-Revisionen vor (HS92/96/02/07/12/17/22). Der Ziel-Zeitraum 2003–2023 aus F2 überspannt mindestens vier Revisionen. Die lokal vorhandene Zip-Datei deckt nur HS22 (2022–2024) ab. `commodity_code_map.csv` hat zwar Spalten `classification_system`/`classification_version`, aber `get_included_code_map()` (`pipeline.py:152–157`) indiziert **nur nach `code`**, ignoriert Version/System — bei mehreren HS-Revisionen mit wiederverwendeten 6-Steller-Codes für unterschiedliche Produkte wäre das eine stille Fehlerquelle, nicht nur ein Erweiterungsaufwand.
2. **Ladeformat:** Aktuell erzeugt `build()` (`pipeline.py:583–708`) genau **eine** `flowmap.json` (Singleton-Datei, wird bei jedem Lauf überschrieben, kein Jahr im Dateinamen/Pfad). Für Mehrjahresdaten skaliert das lineare Größenverhältnis (916 KB/Jahr bei aktueller Top-80-Kürzung) auf ca. 18 MB für 20 Jahre als eine Datei — bei realistischerer, weniger aggressiver Kürzung (näher an den 37 280 ungekürzten Flüssen/Jahr) eher im zweistelligen MB-Bereich pro Jahr, also potenziell 100+ MB für 20 Jahre in einer Datei. Das Frontend lädt aktuell mit einem einzigen `fetch('/render/flowmap.json')` (`main.tsx:1215`) synchron beim Start — dieser Pfad verträgt keine 100-MB-Antwort ohne wahrgenommene Ladezeit. Eine Aufteilung pro Jahr (eigene Datei je Jahr, Jahr lazy nachladen) ist mit dem bestehenden Pipeline-Aufbau ohne Architekturbruch möglich, weil `build()` schon heute alle Zwischenschritte pro `target_year` durchläuft — es fehlt nur die Schleife über Jahre plus Umbenennung der Ausgabedatei von `flowmap.json` auf z. B. `flowmap_{year}.json`.

---

## 3. Pipeline (`src/physical_economy/`, `scripts/build_v01.py`)

### 3.1 Ablauf (`build()`, `pipeline.py:583–708`)

1. Config laden (`configs/datasets.json`, `configs/visualisation.json`) — `load_config`, Z.144–149.
2. Falls Rohquelle ein Zip ist: `countries.csv` aus BACI-Metadaten + externer Zentroid-Tabelle neu erzeugen (`build_countries_from_baci`, Z.224–252) und **überschreiben** (`data/reference/countries.csv`).
3. Rohzeilen laden und auf gemappte HS-Codes filtern (`load_raw_trade_rows`, Z.255–295).
4. Referenztabellen 1:1 nach `data/processed/` kopieren (`copy_reference_tables`, Z.187–192).
5. `trade_flows` bauen (Z.298–335), `net_trade_flows` aggregieren (Z.338–379, nur Paare mit `net_quantity > 0` bleiben erhalten), `trade_metrics` berechnen (Z.382–426, inkl. HHI).
6. CSV-Ausgabe aller Tabellen + **leere** Platzhaltertabellen schreiben (`write_placeholder_tables`, Z.578–580, aus `PLACEHOLDER_TABLES`-Dict Z.16–113).
7. `render_flows` bauen (Z.429–492, inkl. Linienbreiten-Normierung) und pro Commodity auf Top-N kürzen (`limit_render_flows`, Z.495–507).
8. `flowmap.json` bauen (Z.510–575) und **zweimal** wegschreiben: `data/render/` und `web/public/render/` (Z.700–704).

Ausführung: `scripts/build_v01.py` (22 Zeilen, dünner CLI-Wrapper um `build()`), `python3 scripts/build_v01.py`.

### 3.2 MVP.md-Tabellen: real vs. Platzhalter

| Layer (MVP.md) | Tabelle | Zustand |
|---|---|---|
| Layer 0 | `countries`, `commodities`, `commodity_code_map`, `units` | **real**, befüllt |
| Layer 1 | `raw_trade_baci`, `trade_flows`, `net_trade_flows` | **real**, befüllt (1 Jahr) |
| Layer 2 | `production_sources` | **Platzhalter**, 0 Zeilen (nur Header) |
| Layer 3 | `domestic_uses` | **Platzhalter**, 0 Zeilen |
| Layer 4 | `processes`, `process_flows` | **Platzhalter**, 0 Zeilen |
| Layer 5 | `trade_metrics` | **real**, befüllt |
| Layer 5 | `shock_scenarios`, `shock_results_direct` | **nicht vorhanden** — kein Platzhalter, keine Tabelle, kein Code-Bezug |
| Layer 6 | `render_flows`, `flowmap.json` | **real**, befüllt |
| Layer 6 | `render_particles`, `render_columns` | **Platzhalter**, 0 Zeilen. `render_particles` als Tabelle ist zudem obsolet: Das Frontend generiert Partikel client-seitig aus `render_flows` (Abschnitt 1.4), nicht aus einer vorab berechneten Tabelle — die MVP-Vision einer serverseitigen Partikeltabelle wurde durch client-seitige Generierung ersetzt, ohne dass das Datenmodell das nachvollzieht. |

Für F1 (Bilanz-Sicht) heißt das konkret: `production_sources` ist Struktur ohne Inhalt, es gibt keinen Loader-Code für USGS/FAOSTAT/Energy Institute — nur die leere CSV-Kopfzeile aus `PLACEHOLDER_TABLES`.

### 3.3 Aufwand für Erweiterungen

- **Mehrjahres-BACI-Import:** Die Zip-Lesefunktionen (`load_raw_trade_rows`, `read_baci_metadata`) sind bereits pro `target_year` parametrisiert und funktionieren streamend. Der fehlende Teil ist eine Schleife über Jahre in `build()` plus Entkopplung der Ausgabepfade vom Singleton-Muster (aktuell überschreibt jeder Lauf `data/reference/countries.csv`, `data/processed/*.csv` und `flowmap.json` vollständig, ohne Jahr im Namen). Zusätzlich: `get_included_code_map()` müsste HS-Revisionen unterscheiden (siehe 2.3), sobald Jahre vor 2022 (andere HS-Version) dazukommen.
- **Neuer Quellen-Loader (USGS/FAOSTAT/Energy Institute):** Es existiert kein Loader-Interface oder Basisklasse — `load_raw_trade_rows` ist BACI-spezifisch (Zip-Struktur, Spaltennamen `i`/`j`/`k`/`v`/`q`/`t` hartcodiert, Z.272–293). Ein neuer Loader wäre eine komplett neue Funktion nach demselben Muster (CSV/Zip lesen → auf `commodity_id` mappen → Zieltabellenschema füllen), es gibt aber ein brauchbares Vorbild in `build_trade_flows`. Kein struktureller Blocker, aber auch keine Wiederverwendung vorhanden.
- **`production_sources` befüllen:** Reines Daten-Mapping-Problem (Land, Commodity, Jahr, Menge, Quelle → Zielschema aus `PLACEHOLDER_TABLES["production_sources"]`, Z.17–29), kein Pipeline-Umbau nötig, da die Tabelle isoliert von `trade_flows` steht.
- **`processes`/`process_flows` einführen:** Schema ist in MVP.md §9.7 und `PLACEHOLDER_TABLES` (Z.44–73) bereits vollständig spezifiziert (inkl. Vorzeichenkonvention, `flow_role`). Es gibt aber **keinerlei Berechnungslogik** (keine Aktivitäts-/Constraint-Berechnung, kein `Sx`-Mechanismus aus MVP.md §9.2) — das wäre komplett neuer Code, nicht nur Datenbefüllung.

### 3.4 Tests und Konfiguration

- `tests/test_pipeline.py` (51 Zeilen): **ein** Testmodul, zwei Testfälle, beide laufen gegen den **echten** `build()`-Aufruf mit den echten Configs (`setUpClass`, Z.15–16 — kein Mocking, kein Fixture-Datensatz). Geprüft werden: Summary-Kennzahlen (Mindestanzahl Flows/Commodities), Vorhandensein harter Commodity-IDs (`crude_oil`, `hard_coal`, `wheat`, `iron_ore`, `natural_gas`), Tooltip-Inhalt und Linienbreiten-Grenzen. Kein Test für `net_trade_flows`-Korrektheit im Detail (z. B. Symmetrie, Vorzeichen), keine Tests für Frontend-Code, keine Tests für die Platzhaltertabellen. Testlaufzeit hängt an der echten 301-MB-Zip-Datei — CI ohne diese Datei (nicht im Git, `.gitignore`) würde fehlschlagen, sofern nicht auf die Seed-CSV umgeschaltet wird.
- `configs/datasets.json`: `target_year` (aktuell `2024`, einzelner Wert, kein Array), `raw_trade_path`, Quellenmetadaten. Kein Mechanismus für „mehrere Jahre" oder „mehrere Quellen" im Schema.
- `configs/visualisation.json`: Farbzuordnung pro Commodity (`commodity_colors`), Render-Limits (`max_render_flows_per_commodity`, Linienbreiten-Grenzen), `default_flow_mode`. Das ist der einzige Ort, an dem Commodities visuell (Farbe) deklariert werden; die fachliche Commodity-Liste selbst steht in `data/reference/commodities.csv` (21 Zeilen, 4 Gruppen: `energy`, `agriculture`, `metals`, `fertilizer`) und `data/reference/commodity_code_map.csv` (60 HS6-Code-Zeilen, alle `classification_version: 2022`).

---

## 4. Bewertung

### 4.1 Fünf größte technische Risiken/Engpässe für F1–F6

1. **HS-Revisionsbruch bei Mehrjahresdaten (F2, F4).** Der Zielzeitraum 2003–2023 überspannt mehrere HS-Revisionen; die lokale Datenquelle deckt nur HS22 (2022–2024) ab, und `get_included_code_map()` (`pipeline.py:152`) mappt Codes ohne Versionsprüfung. Ohne Korrektur ist eine stille Falschzuordnung von Commodities über Jahre hinweg möglich, sobald ältere HS-Revisionen dazukommen — nicht nur ein Datenbeschaffungsproblem, sondern ein Korrektheitsrisiko im bestehenden Mapping-Code.
2. **Fehlender zentraler App-State + fehlender kontrollierter Kamera-State (F1–F6 gemeinsam).** Jede neue Sicht (Bilanz, Kette), die Zeitachse und Presets/Share-Links (F6) brauchen einen gemeinsamen, adressierbaren Zustand (Commodity, Jahr, Sicht, Selektion, Kamera). Aktuell ist State auf 7+4 `useState`-Aufrufe in zwei Komponenten verstreut, Kamera ist gar nicht in React sichtbar. Das ist kein Performance-Risiko, sondern ein Umbau-Risiko: Ohne Vorarbeit wird jede der drei Sichten aus Abschnitt 4 der Roadmap ihren eigenen State erfinden und dabei mit der Kamera-Erhaltungsanforderung kollidieren.
3. **Renderdaten-Ladeformat skaliert nicht auf „20 Jahre × alle Commodities" (F2).** Eine einzelne, bei jedem Build überschriebene `flowmap.json` ohne Jahres-Partitionierung; das Frontend lädt sie synchron und vollständig beim Start (`main.tsx:1215`). Ohne Umbau (Jahres-Dateien, Lazy-Load) wird der erste Ladevorgang bei Mehrjahresdaten schnell mehrstellige MB groß.
4. **Ländermap ist Hover-only, ohne ID-Brücke zur Pipeline (F1, F5).** Die Choropleth-/Klick-Anforderung aus F1 setzt voraus, dass Natural-Earth-Länder-Properties zuverlässig auf `country_id` (BACI-ISO3) gemappt werden. Diese Brücke existiert nicht; die Geometrie kommt zur Laufzeit von einer externen GitHub-URL ohne Versionspin, was auch ein Verfügbarkeits-/Reproduzierbarkeitsrisiko ist (kein Fallback, wenn die URL nicht erreichbar oder das Fremd-Repo geändert ist).
5. **`processes`/`process_flows` haben ein Schema, aber keine Rechenlogik (F3).** Die MVP.md-Spezifikation (§9) ist detailliert, aber im Code existiert weder eine `Sx`-Berechnung noch eine Aktivitäts-/Constraint-Prüfung. F3 (Ketten-Sicht) braucht nicht nur Dateneingabe, sondern ein bislang komplett unimplementiertes Rechenmodell — das ist der einzige Punkt unter F1–F3, an dem nicht „Daten befüllen", sondern „Kernlogik neu bauen" ansteht.

### 4.2 Refactoring-Empfehlung

**Vor neuen Features (F1 ff.) sinnvoll, weil sonst mehrfach umgebaut wird:**
- `main.tsx` in Module trennen entlang der bereits vorhandenen natürlichen Bruchlinie: die Geometrie-/Partikelmathematik (Z.229–724) ist schon reine, React-freie Funktionslogik und lässt sich verlustfrei auslagern; `MapStage` (Layer-Konstruktion) und die UI-Panels in `App` (Commodity-Auswahl, Render-Tuning, Legende, Steckbrief) sind es nicht und müssten für F1 (neues Kontext-Panel), F2 (Zeitleiste) und die Sicht-Umschaltung ohnehin in eigene Komponenten aufgeteilt werden.
- Einen zentralen App-State einführen (Commodity, Jahr, Sicht, Selektion, Kamera), inklusive eines kontrollierten `viewState` für `DeckGL`. Das ist Voraussetzung für F1 (Land-Fokus), F2 (Jahr), F6 (Presets/Share-Links) und wird von jedem einzelnen dieser Features gebraucht — je später der Umbau, desto mehr bereits gebaute Panels müssen migriert werden.
- Renderdaten-Ausgabe von „eine `flowmap.json`" auf „eine Datei pro Jahr" umstellen, bevor F2 (Mehrjahres-BACI) beginnt — die Pipeline-Schleife über Jahre und das Lazy-Load-Konzept im Frontend hängen an derselben Entscheidung und sollten nicht zweimal gebaut werden.

**Kann warten:**
- Choropleth-Farblogik und Klick-Handler auf der Ländermap — technisch günstig (deck.gl-Picking ist vorhanden), lohnt sich erst mit echten `production_sources`/Bilanzdaten (F1), vorher gibt es nichts zum Einfärben.
- HS-Revisions-Mapping-Korrektur — nötig für F2/F4, aber erst wenn tatsächlich Jahre vor 2022 importiert werden; für 2022–2024 (aktuelle Datenlage) ist das Risiko inaktiv.
- `processes`/`process_flows`-Rechenlogik (F3) — laut Roadmap ohnehin P2, kann nach F1/F2-Umbauten kommen.
- deck.gl/`@flowmap.gl/layers`-Versions-Update — kein akuter Bedarf, nur bei zukünftigen Sicherheits-/Kompatibilitätsproblemen relevant.

---

## 5. Direkte Antworten auf die offenen Fragen (feature_roadmap.md, Abschnitt 6)

1. **`main.tsx`-Struktur:** siehe 1.1. Natürliche Schnittstelle: Geometrie/Partikel-Mathematik (Z.229–724) ist bereits isolierbar; `MapStage`/`App` sind es nicht und müssten für Sichten/Zeitachse/Panels aufgebrochen werden.
2. **Renderdatenpfad:** `flowmap.json` = 916 KB für 1 Jahr/20 Commodities/1600 (bereits auf Top-80-pro-Commodity gekürzte) Flüsse, siehe 2.1–2.3. Ladekonzept-Engpass: Singleton-Datei ohne Jahres-Partitionierung, synchroner Fetch beim Start. Partikelzahl-Grenze: UI-Slider bei 120 000 (Z.1376), technisch durch Single-Draw-Call-Rendering (`ScatterplotLayer`) nicht der limitierende Faktor — Draw-Calls sind nur beim Flowmap-Modus (ein Layer pro Commodity) relevant, nicht bei Partikeln.
3. **Zustandsarchitektur:** kein zentraler State, siehe 1.2. Muss für F1–F6 neu geschaffen werden, inklusive kontrolliertem Kamera-State.
4. **Pipeline-Erweiterbarkeit:** siehe 3.2/3.3. Mehrjahres-Import ist am Loader-Code vorbereitet, aber am HS-Revisions-Mapping und an der Singleton-Ausgabe blockiert. Neue Quellen-Loader und `production_sources`-Befüllung sind reine Zusatzarbeit ohne Architekturkonflikt. `processes`/`process_flows` fehlt die Rechenlogik komplett, nicht nur Daten.
5. **Ländermap:** siehe 1.3. Geometrie + Picking vorhanden und Klick-tauglich, aber aktuell nur Hover, keine Choropleth, keine ID-Brücke zur Pipeline, externe Laufzeit-Abhängigkeit von einer ungepinnten GitHub-URL.
6. **Konfigurationssystem:** `configs/datasets.json` (Quelle, Zieljahr — einzelner Wert, kein Mehrjahres-Schema) und `configs/visualisation.json` (Commodity-Farben, Render-Limits). Fachliche Commodity-/Gruppendeklaration liegt separat in `data/reference/commodities.csv` und `commodity_code_map.csv`, nicht in `configs/`.
