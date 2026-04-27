# Minimum Viable Product: Global Commodity Trade Atlas

**Architekturpapier für den ersten Prototyp und seine Erweiterungspfade**  
**Stand:** 2026-04-26  
**Arbeitstitel:** *Vom Handelsatlas zur physischen Weltwirtschaftssimulation*  
**Leitbild:** *Erst Lehm, Holz, Stroh, Schaf und Erz. Dann Rohöl, Weizen, Kupfer, Kohle und Eisen. Wir sind ja keine Barbaren — nur methodisch größenwahnsinnig.*

---

## 1. Zweck dieses Dokuments

Dieses Dokument beschreibt den ersten baubaren Prototypen des Projekts. Der Prototyp beginnt mit internationalen Handelsflüssen, wird aber von Anfang an so entworfen, dass spätere Module sauber andocken können:

- Quellen- und Produktionslayer,
- Senken- und Nutzungslayer,
- Transformations- und Prozesslayer,
- Auswertungs- und Schocksimulationslayer,
- Visualisierungslayer mit einfachen Linien, später echten Partikel- und Rauchfahnenströmen.

Der zentrale Architekturgrundsatz lautet:

> Das Datenmodell darf nicht von der ersten Visualisierung gefangen genommen werden.

Die erste Visualisierung darf ruhig schlicht sein. Die Tabellenstruktur muss aber so sauber sein, dass daraus später ein ernsthaftes physisches Weltwirtschaftsmodell wachsen kann.

---

## 2. Kernidee des Minimum Viable Product

**Minimum Viable Product (MVP)** bedeutet hier: das kleinste sinnvoll nutzbare Produkt.

Die erste Version baut einen **Global Commodity Trade Atlas**, also einen globalen Atlas physischer Warenströme.

Die erste Version betrachtet zunächst:

```text
Exportland → Importland × Produkt × Jahr × Menge
```

Sie betrachtet bewusst noch nicht vollständig:

- inländische Produktion,
- inländischen Verbrauch,
- Lager,
- Transformationen,
- echte Seewege,
- echte Transportdauern,
- Preiseffekte,
- vollständige Lieferketten.

Das Ziel ist nicht sofort die ganze Weltwirtschaftssimulation. Das Ziel ist ein sauberer erster Layer:

> Wer schickt was wohin — und in welcher Größenordnung?

---

## 3. Warum Trade-only zuerst?

Trade-only, also nur der internationale Handel, ist unvollständig, aber als Start extrem stark.

Er zeigt:

- globale Hauptströme,
- externe Abhängigkeiten,
- bilaterale Lieferbeziehungen,
- Export- und Importkonzentration,
- geopolitisch empfindliche Flüsse,
- erste direkte Schockexposition.

Er zeigt noch nicht:

- gesamten Inlandsverbrauch,
- gesamte Förderung,
- nicht gehandelte Binnenströme,
- finale Nutzung,
- Prozessketten.

Beispiel:

Ein Land kann riesige Mengen Kohle selbst fördern und selbst verbrennen. Im reinen Handelsmodell erscheint diese Kohle kaum, obwohl der materielle Inlandsstoffwechsel groß ist.

Darum heißt Version 0.1 bewusst:

> Handelsatlas, nicht vollständiges Materialflussmodell.

---

## 4. Architekturprinzip: Layer statt Monolith

Das Projekt wird als Schichtmodell entworfen.

```text
Layer 0: Referenzdaten und Ontologien
Layer 1: Handelsflüsse
Layer 2: Quellen und Produktion
Layer 3: Senken und Nutzung
Layer 4: Transformationen und Prozesse
Layer 5: Auswertung, Abhängigkeit, Schocks
Layer 6: Visualisierung und Interaktion
```

Wichtig:

- Jeder Layer hat eigene Tabellen.
- Jeder Layer hat klar definierte Eingänge und Ausgänge.
- Kein Layer darf heimlich Annahmen aus einem anderen Layer einbauen.
- Die Visualisierung liest vorbereitete Darstellungsdaten, aber definiert nicht das Kernmodell.

Kurz:

> Die Grafik darf schön bekloppt sein. Die Datenstruktur nicht.

---

## 5. Layer 0: Referenzdaten und Ontologien

Layer 0 ist die stille Infrastruktur. Hier liegen die Dinge, die alle anderen Layer brauchen.

### 5.1 Länder und Regionen

Tabelle: `countries`

```text
country_id
iso3_code
country_name
region
subregion
latitude
longitude
valid_from
valid_to
notes
```

**ISO** steht für **International Organization for Standardization**, also Internationale Organisation für Normung.  
**ISO-3** meint dreibuchstabige Ländercodes.

Zweck:

- Länder eindeutig identifizieren,
- Koordinaten für Karten bereitstellen,
- historische oder politische Sonderfälle dokumentieren,
- spätere Aggregation nach Regionen ermöglichen.

---

### 5.2 Rohstoffe und Produkte

Tabelle: `commodities`

```text
commodity_id
commodity_group
commodity_name
physical_unit_default
is_primary_resource
is_energy_carrier
is_food_related
is_mineral_related
notes
```

Beispiele:

```text
crude_oil
hard_coal
wheat
maize
soybeans
iron_ore
copper_ore
phosphate_rock
primary_aluminium
```

Diese Tabelle ist nicht bloß Bequemlichkeit. Sie ist der Kern der späteren Produktontologie.

---

### 5.3 Handelscode-Mapping

Tabelle: `commodity_code_map`

```text
commodity_id
classification_system
classification_version
code
code_label
include_flag
mapping_confidence
notes
```

Beispiel:

```text
commodity_id: crude_oil
classification_system: Harmonized System
classification_version: 2022
code: 2709
code_label: Petroleum oils and oils obtained from bituminous minerals, crude
```

**Harmonized System (HS)** steht für **Harmonized Commodity Description and Coding System**, also das international harmonisierte Warenbeschreibungssystem.

Warum diese Tabelle wichtig ist:

- Ein Rohstoff kann mehrere Handelscodes umfassen.
- Handelscodes ändern sich über Revisionen.
- Einige Codes sind zu breit und brauchen Unsicherheitsmarkierung.
- Spätere Datenquellen verwenden andere Klassifikationen.

Das ist der Ort, an dem wir verhindern, dass der Tabellenkobold heimlich Sojaöl, Sojaschrot und Sojabohnen in einen Topf wirft und dann „Agrarfluss“ draufschreibt. Frechheit, sowas.

---

### 5.4 Einheiten und Umrechnungen

Tabelle: `units`

```text
unit_id
unit_name
unit_type
conversion_to_base_unit
notes
```

Beispiele:

```text
tonne
kilogram
terajoule
petajoule
exajoule
hectare
person_hour
```

Für Version 0.1 gilt:

```text
Primäre Einheit = metrische Tonne
```

Energieumrechnungen kommen später, weil Rohöl, Gas und Kohle je nach Qualität unterschiedliche Heizwerte haben.

---

## 6. Layer 1: Handelsflüsse

Layer 1 ist der erste tatsächlich gebaute Layer.

### 6.1 Primäre Datenquelle

Primäre Datenquelle für Version 0.1:

**Centre d’Études Prospectives et d’Informations Internationales — Base pour l’Analyse du Commerce International (CEPII BACI)**.

**BACI** steht für **Base pour l’Analyse du Commerce International**.  
**CEPII** steht für **Centre d’Études Prospectives et d’Informations Internationales**.

Rolle:

- jährliche bilaterale Warenhandelsflüsse,
- Produktniveau nach sechsstelligen Harmonized-System-Codes,
- Mengen und Handelswerte,
- harmonisierte Handelsmeldungen.

Quelle: <https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html>

Sekundäre Quelle für spätere Versionen:

**United Nations Comtrade Database (UN Comtrade)**.

**UN** steht für **United Nations**, also Vereinte Nationen.

Rolle:

- monatliche Handelsdaten,
- Spezialabfragen,
- Vergleichsquelle.

Quelle: <https://comtrade.un.org/>

---

### 6.2 Rohdaten-Tabelle

Tabelle: `raw_trade_baci`

```text
year
exporter_code
importer_code
hs_code
trade_value_usd_thousand
quantity_tonnes
source_dataset
source_version
```

Diese Tabelle bleibt möglichst nah an der Datenquelle.

Grundsatz:

> Rohdaten nicht direkt überschreiben. Immer transformieren, nie verstümmeln.

---

### 6.3 Normalisierte Handelsflüsse

Tabelle: `trade_flows`

```text
flow_id
year
exporter_country_id
importer_country_id
commodity_id
classification_system
classification_version
classification_code
quantity_tonnes
trade_value_usd_thousand
source_dataset
source_version
mapping_confidence
notes
```

Zweck:

- zentrale Faktentabelle für Handelsflüsse,
- anschlussfähig an spätere Quellen-, Senken- und Prozesslayer,
- unabhängig von einer konkreten Visualisierung.

---

### 6.4 Brutto- und Nettoströme

Für die Analyse brauchen wir beide Modi.

#### Bruttoströme

Bruttoströme zeigen die reale Handelsaktivität:

```text
A → B = exportierte Menge von A nach B
B → A = exportierte Menge von B nach A
```

Vorteil:

- zeigt tatsächliches Handelsvolumen,
- wichtig für Logistik und reale Warenbewegung.

Nachteil:

- bidirektionale Flüsse können visuell unruhig werden.

#### Nettoströme

Nettoströme reduzieren zwei Gegenrichtungen auf eine Richtung:

```text
net_flow(A → B) = export(A → B) - export(B → A)
```

Wenn der Wert positiv ist, wird A nach B visualisiert. Wenn der Wert negativ ist, wird B nach A visualisiert.

Vorteil:

- zeigt dominante Richtung,
- visuell klarer,
- gut für Rauchfahnen- und Partikeldarstellung.

Nachteil:

- kann große wechselseitige Handelsvolumina verstecken.

Architekturentscheidung:

```text
Analyse: Brutto und Netto speichern.
Visualisierung: zunächst wählbar, Standard für Rauchfahnen = Netto.
```

Tabelle: `net_trade_flows`

```text
net_flow_id
year
country_a_id
country_b_id
origin_country_id
destination_country_id
commodity_id
gross_a_to_b_tonnes
gross_b_to_a_tonnes
net_quantity_tonnes
net_direction
source_trade_flow_ids
```

---

## 7. Layer 2: Quellen und Produktion

Layer 2 wird noch nicht im ersten Sprint vollständig gebaut, aber seine Andockstelle wird jetzt entworfen.

Zweck:

> Wo entsteht ein Rohstoff oder Produkt physisch?

Beispiele:

- Kohleförderung,
- Rohölförderung,
- Weizenproduktion,
- Maisproduktion,
- Eisenerzförderung,
- Kupferminenproduktion.

Tabelle: `production_sources`

```text
source_id
year
country_id
commodity_id
quantity
unit_id
source_type
source_dataset
source_version
spatial_precision
notes
```

Mögliche Werte für `source_type`:

```text
mine_extraction
agricultural_harvest
energy_extraction
industrial_production
forestry_harvest
livestock_production
```

Wichtig:

- Dieser Layer ist nicht nur für Säulenvisualisierung da.
- Er ist die Grundlage für spätere Materialbilanzen.

Spätere Kernformel:

```text
scheinbarer Inlandsverbrauch = Produktion + Import - Export ± Lageränderung
```

---

## 8. Layer 3: Senken und Nutzung

Layer 3 beschreibt, wo ein Stoff genutzt, verbraucht, gelagert oder in andere Bestände überführt wird.

Beispiele:

- Nahrung,
- Tierfutter,
- Saatgut,
- Industrieinput,
- Energieerzeugung,
- Bau,
- Lager,
- Abfall,
- Emission.

Tabelle: `domestic_uses`

```text
use_id
year
country_id
commodity_id
use_category
quantity
unit_id
source_dataset
source_version
is_observed
is_inferred
method_notes
```

Mögliche Werte für `use_category`:

```text
food
feed
seed
industrial_use
energy_use
construction
stock_addition
losses
waste
exports_after_processing
unknown_residual
```

Wichtig:

- Senken können teilweise beobachtet sein.
- Senken können teilweise aus Bilanzen abgeleitet sein.
- Abgeleitete Senken müssen als abgeleitet markiert werden.

Merksatz:

> Eine berechnete Senke ist kein gemessener Eimer. Sie ist ein methodischer Eimer. Eimer mit Fußnote, bitte.

---

## 9. Layer 4: Transformationen und Prozesse

Layer 4 beschreibt, wie Inputs in Outputs verwandelt werden.

Beispiele:

```text
Bauxit → Aluminiumoxid → Primäraluminium
Eisenerz + Kohle/Koks → Stahl
Rohöl → Benzin, Diesel, Kerosin, Naphtha
Erdgas → Ammoniak → Harnstoff
Sojabohne → Sojaschrot + Sojaöl
Mais → Tierfutter → Fleisch/Milch/Eier
```

Dieser Layer wird noch nicht im ersten Minimalprodukt gebaut, aber seine Struktur wird vorbereitet.

### 9.1 Prozesse

Tabelle: `processes`

```text
process_id
process_name
process_group
default_region
technology_variant
notes
```

### 9.2 Prozessinputs

Tabelle: `process_inputs`

```text
process_id
input_commodity_id
input_quantity
input_unit_id
per_output_quantity
per_output_unit_id
coefficient_type
source_dataset
source_version
uncertainty_notes
```

### 9.3 Prozessoutputs

Tabelle: `process_outputs`

```text
process_id
output_commodity_id
output_quantity
output_unit_id
per_input_quantity
per_input_unit_id
coefficient_type
source_dataset
source_version
uncertainty_notes
```

Mögliche Werte für `coefficient_type`:

```text
technical_average
country_specific
industry_average
literature_estimate
life_cycle_inventory
calibrated_from_balance
```

**Life Cycle Inventory (LCI)** bedeutet Lebenszyklusinventar: eine Datensammlung über Material- und Energieinputs sowie Outputs eines Prozesses.

**Life Cycle Assessment (LCA)** bedeutet Lebenszyklusanalyse: eine Methode, um Umweltwirkungen über Lebenszyklen hinweg zu bewerten.

---

## 10. Layer 5: Auswertung, Abhängigkeit und Schocks

Layer 5 berechnet Metriken und Szenarien.

### 10.1 Grundmetriken

Tabelle: `trade_metrics`

```text
year
country_id
commodity_id
total_import_tonnes
total_export_tonnes
net_import_tonnes
net_export_tonnes
number_of_suppliers
largest_supplier_share
herfindahl_hirschman_index
notes
```

Der **Herfindahl-Hirschman Index** ist ein Konzentrationsmaß. Er berechnet die Summe der quadrierten Anteile. Im Projekt kann er zeigen, ob ein Land bei einem Rohstoff von vielen Lieferanten oder wenigen Lieferanten abhängt.

### 10.2 Schocks

Tabelle: `shock_scenarios`

```text
scenario_id
scenario_name
year
commodity_id
affected_country_id
affected_region
shock_type
shock_size_fraction
notes
```

Mögliche Werte für `shock_type`:

```text
export_reduction
import_blockade
production_loss
transport_corridor_loss
demand_surge
```

Tabelle: `shock_results_direct`

```text
scenario_id
country_id
commodity_id
baseline_import_tonnes
shocked_import_tonnes
absolute_loss_tonnes
relative_loss_fraction
notes
```

Version 0.1 kann nur direkte Handelsverluste berechnen.

Noch nicht enthalten:

- Lager,
- Reserven,
- alternative Lieferanten mit freier Kapazität,
- Preise,
- Substitution,
- politische Priorisierung,
- Prozessketteneffekte.

---

## 11. Layer 6: Visualisierung

Layer 6 darf mehrere Engines haben. Wichtig ist, dass sie alle aus denselben vorbereiteten Daten lesen.

### 11.1 Visualisierungsgrundsatz

```text
Kernmodell → Renderdaten → Visualisierung
```

Nicht:

```text
Visualisierung → heimliches Kernmodell
```

Die Visualisierung bekommt also vorbereitete Tabellen, zum Beispiel:

- `render_flows`,
- `render_particles`,
- `render_columns`,
- `render_tooltips`.

---

### 11.2 Schneller Visualisierungsmodus: Linien und Bögen

Für den ersten Sichttest kann ein einfacher Linien- oder Bogenmodus verwendet werden.

Mögliche Werkzeuge:

- **deck.gl ArcLayer** für gebogene Handelsverbindungen,
- **deck.gl GreatCircleLayer** für Großkreisverbindungen,
- **flowmap.gl FlowmapLayer** für Flowmap-Darstellungen mit Linien und optionaler Animation.

**deck.gl** ist eine Visualisierungsbibliothek für große geographische Datenmengen im Browser.  
**flowmap.gl** ist eine Bibliothek für Flusskarten, die auf deck.gl aufsetzt.  
**WebGL** steht für **Web Graphics Library**, also eine browserbasierte Schnittstelle für hardwarebeschleunigte Grafik.

Dieser Modus ist nicht das Endziel, aber sehr nützlich:

- schnell sichtbar,
- gute Debugging-Hilfe,
- prüft Datenmodell und Filter,
- prüft Länderkoordinaten,
- prüft Brutto- und Nettoströme.

Merksatz:

> Pfeile sind nicht sexy, aber sie sagen uns, ob der Datenmotor überhaupt anspringt.

---

### 11.3 Zielvisualisierung: Partikel- und Rauchfahnenströme

Das eigentliche Zielbild ist keine klassische Pfeilkarte, sondern eine Partikel-Dichte-Visualisierung.

Mentales Modell:

```text
Quelle emittiert Partikel.
Partikel bewegen sich zum Ziel.
Partikeldichte zeigt Flussstärke.
Streuung erzeugt Fahnencharakter.
Zeitliche Emission erzeugt Bewegung.
```

Das wirkt wie:

- Rauchfahne,
- Windfahne,
- Satelliten-Zeitraffer,
- Feuer- oder Staubausbreitung,
- Ameisenstraße,
- planetarer Stoffwechsel.

Tabelle: `render_particles`

```text
particle_id
render_time_start
render_time_duration
origin_country_id
destination_country_id
origin_longitude
origin_latitude
destination_longitude
destination_latitude
commodity_id
commodity_group
quantity_represented
unit_id
color_rgba
radius
jitter_seed
path_variant
source_flow_id
```

**RGBA** steht für **Red Green Blue Alpha**, also Rot-Grün-Blau-Farbwerte plus Transparenzkanal.

Technische Idee:

```text
1. Handelsfluss auswählen.
2. Menge in visuelle Partikel übersetzen.
3. Startzeitpunkte über das Jahr verteilen.
4. Start- und Zielpunkte leicht streuen.
5. Position pro Zeitpunkt entlang eines Pfades berechnen.
6. Punkte rendern.
7. Optional kurze Trails oder Dichtefahnen hinzufügen.
```

Wichtig:

- Diese Partikel sind visuelle Samples.
- Ein Partikel kann zum Beispiel 100.000 Tonnen repräsentieren.
- Die Bewegung ist eine Visualisierung, keine echte Transportphysik.
- Streuung ist ein Darstellungsmittel, keine echte Unsicherheit, außer explizit so modelliert.

---

### 11.4 Produktionssäulen und spätere Senkensäulen

Für Layer 2 und Layer 3 wird eine Säulenvisualisierung vorbereitet.

Tabelle: `render_columns`

```text
column_id
year
country_id
commodity_id
column_type
quantity
unit_id
scaled_height
base_longitude
base_latitude
render_longitude
render_latitude
grid_x
grid_y
color_rgba
source_table
source_id
```

Mögliche Werte für `column_type`:

```text
production
apparent_domestic_use
observed_use
stock_addition
losses
```

Visualisierungsidee:

```text
pro Land ein 3×3-Säulenkarree
jede Säule = ein Rohstoff oder eine Produktgruppe
Höhe = Menge, logarithmisch oder wurzelskaliert
Farbe = Produktgruppe
```

Werkzeug:

- **deck.gl ColumnLayer** für Säulen.

Später möglich:

- Produktion und Senke nebeneinander,
- Produktion als Säulen nach oben,
- Senken als zweite Säulengruppe,
- Nutzungskategorien als gestapelte Säulen.

Für Version 0.1 wird nur die Datenstruktur vorbereitet. Gebaut wird zuerst der Handelsfluss.

---

## 12. Renderer-Adapter statt Einweg-Grafik

Damit das Projekt zukunftssicher bleibt, wird die Visualisierung modular behandelt.

Abstraktion:

```text
RenderInput
  → FlowLineRenderer
  → ParticlePlumeRenderer
  → ColumnRenderer
  → DashboardRenderer
```

Mögliche Renderdaten:

```text
render_flows
render_particles
render_columns
render_country_metrics
```

Die eigentliche Anwendung sollte nicht davon abhängen, ob am Anfang flowmap.gl, deck.gl ArcLayer oder eine eigene Partikelmaschine verwendet wird.

Architekturentscheidung:

```text
Die Datenpipeline erzeugt neutrale Renderdaten.
Die Grafikengine ist austauschbar.
```

Das ist wichtig, weil wir zuerst vielleicht simple Linien bauen, später aber auf Rauchfahnen wechseln wollen, ohne das gesamte Modell zu zerlegen.

---

## 13. Technologievorschlag

### 13.1 Datenverarbeitung

- Python,
- pandas oder Polars,
- DuckDB,
- Parquet,
- Jupyter Notebook für Exploration,
- später Skripte oder Module für reproduzierbare Pipeline.

**DuckDB** ist eine eingebettete analytische Datenbank.  
**Parquet** ist ein spaltenorientiertes Dateiformat für effiziente analytische Datenverarbeitung.

### 13.2 Konfiguration

- YAML Ain’t Markup Language (YAML) für Produktmapping und Szenarien,
- JavaScript Object Notation (JSON) für exportierte Konfigurationen oder Webdaten.

### 13.3 Visualisierung

- deck.gl für Kartenlayer,
- flowmap.gl optional für schnellen Flowmap-Prototyp,
- später eigene Partikelmaschine auf Basis von deck.gl ScatterplotLayer oder einem Custom Layer,
- optional Streamlit für schnelle Dashboards.

**Streamlit** ist ein Python-Framework für schnelle Datenanwendungen im Browser.

---

## 14. Projektstruktur

Vorschlag:

```text
project_root/
  README.md
  data/
    raw/
    interim/
    processed/
    render/
  docs/
    MVP.md
    roadmap.md
  configs/
    commodities.yml
    datasets.yml
    visualisation.yml
    scenarios.yml
  notebooks/
    01_explore_baci.ipynb
    02_build_trade_layer.ipynb
    03_net_flows.ipynb
    04_first_visualisation.ipynb
  src/
    core/
      schema.py
      units.py
      countries.py
      commodities.py
    ingestion/
      load_baci.py
      load_comtrade.py
    layers/
      trade.py
      production.py
      use.py
      transformation.py
      analysis.py
    render/
      build_render_flows.py
      build_render_particles.py
      build_render_columns.py
    visualisation/
      flowmap_renderer.py
      arc_renderer.py
      particle_renderer.py
      column_renderer.py
  outputs/
    tables/
    maps/
    animations/
```

**README** steht für „Read Me“, also eine Einstiegsdatei mit Projektbeschreibung.

---

## 15. Tabellen statt Klassen — aber nicht ohne Struktur

Das Kernmodell sollte tabellarisch gedacht werden, weil die Daten ohnehin tabellarisch sind:

- Länder,
- Produkte,
- Handelsflüsse,
- Produktionsmengen,
- Nutzungen,
- Prozesskoeffizienten,
- Auswertungsergebnisse.

Aber: Kleine Klassen oder Module sind trotzdem sinnvoll für Logik.

Beispiel:

```text
Tabellen = persistenter Modellzustand
Funktionen/Module = Transformationen zwischen Tabellen
Renderer = Darstellung vorbereiteter Tabellen
```

Nicht:

```text
Alles als riesige objektorientierte Klassenhierarchie bauen.
```

Sondern:

```text
Saubere Tabellen + kleine, klare Transformationsfunktionen.
```

Also kein Java-Ritterorden mit 47 abstrakten Basisklassen. Wir bauen eine Datenmaschine, keinen Behördenflur.

---

## 16. Pipeline für Version 0.1

### Schritt 1: Referenzdaten anlegen

- Länder laden,
- Koordinaten ergänzen,
- Commodity-Tabelle anlegen,
- Commodity-Code-Mapping erstellen.

### Schritt 2: CEPII-BACI-Daten laden

- Rohdaten ablegen,
- Datenversion dokumentieren,
- Zieljahr auswählen.

### Schritt 3: Handelsdaten normalisieren

- Länder mappen,
- Harmonized-System-Codes mappen,
- Mengen standardisieren,
- `trade_flows` erzeugen.

### Schritt 4: Brutto- und Nettoströme berechnen

- `trade_flows` bleibt brutto,
- `net_trade_flows` wird zusätzlich erzeugt.

### Schritt 5: Grundmetriken berechnen

- Top-Exporteure,
- Top-Importeure,
- größte bilaterale Flüsse,
- Lieferantenkonzentration,
- Herfindahl-Hirschman Index.

### Schritt 6: einfache Visualisierung

Zuerst:

- ArcLayer, GreatCircleLayer oder flowmap.gl,
- keine eigene Partikelmaschine erforderlich.

Zweck:

- Daten prüfen,
- Architektur testen,
- erste Karte sehen.

### Schritt 7: Partikeldaten vorbereiten

Noch nicht zwingend rendern, aber Tabellenstruktur anlegen:

- `render_particles`,
- Partikel-Sampling-Logik,
- Netto- oder Bruttofluss auswählbar.

---

## 17. Akzeptanzkriterien für Version 0.1

Version 0.1 ist erfolgreich, wenn:

1. Ein Zieljahr aus CEPII BACI geladen wird.
2. Mindestens drei Produktgruppen über `commodity_code_map` gefiltert werden können.
3. `trade_flows` korrekt erzeugt wird.
4. `net_trade_flows` korrekt erzeugt wird.
5. Top-Exporteure, Top-Importeure und größte Flüsse berechnet werden.
6. Ein einfacher Kartenlayer Handelsflüsse darstellen kann.
7. Das Datenmodell bereits Tabellen für Quellen, Senken und Transformationen vorsieht.
8. Visualisierung und Kernmodell getrennt sind.
9. Die Renderdaten aus neutralen Tabellen erzeugt werden.
10. Alle Datenquellen, Versionen, Einheiten und Mapping-Annahmen dokumentiert werden.

---

## 18. Nicht-Ziele für Version 0.1

Nicht bauen:

- vollständiges Quellenmodell,
- vollständiges Senkenmodell,
- echte Inlandssenken,
- Transformationsketten,
- echte Seewege,
- Häfen,
- Transportdauer,
- Lager,
- Preise,
- Substitution,
- monetäre Input-Output-Modelle,
- vollständige Multi-Regional-Input-Output-Integration,
- perfekte Partikel-Rauchfahnenengine.

**Multi-Regional Input-Output (MRIO)** bedeutet ein Input-Output-Modell, das mehrere Länder oder Regionen und ihre sektoralen Vorleistungsbeziehungen abbildet.

Kurz:

> Keine Weltrettungsmaschine in Sprint 1. Erstmal den Datenmotor bauen und schauen, ob das Schaf überhaupt fliegt.

---

## 19. Erweiterungslogik nach Version 0.1

### Version 0.2: Partikel-Prototyp

- `render_particles` tatsächlich rendern,
- ScatterplotLayer oder Custom Layer testen,
- Partikelpfade, Jitter, Trails und Fade entwickeln.

### Version 0.3: Produktionssäulen

- `production_sources` mit ausgewählten Daten füllen,
- `render_columns` erzeugen,
- 3×3-Säulenkarrees pro Land testen.

### Version 0.4: Senken und scheinbarer Inlandsverbrauch

- Produktion + Import - Export berechnen,
- erste `domestic_uses`-Tabelle füllen,
- Nutzungskategorien vorbereiten.

### Version 0.5: Schockanalyse

- einfache Angebotsschocks,
- direkte Importverluste,
- Länder-Exposition,
- Exportland- oder Regionsausfall.

### Version 0.6: Transformationen

- ausgewählte Prozessketten modellieren,
- Rohöl zu Raffinerieprodukten,
- Eisenerz und Kohle zu Stahl,
- Erdgas zu Ammoniak und Dünger,
- Sojabohnen zu Sojaschrot und Sojaöl.

---

## 20. Erste Produktgruppen

Für den ersten Bauabschnitt werden wenige, aber zentrale Produktgruppen empfohlen.

### Energie

- Kohle,
- Rohöl,
- raffinierte Erdölprodukte,
- Erdgas und verflüssigtes Erdgas,
- Elektrizität.

### Landwirtschaft und Futter

- Weizen,
- Mais,
- Sojabohnen,
- Sojaschrot und Ölkuchen,
- Pflanzenöle.

### Metalle und Industrie

- Eisenerz,
- Kupfererz,
- raffiniertes Kupfer,
- Bauxit oder Aluminiumoxid,
- Rohaluminium.

### Dünger und Bodenfruchtbarkeit

- Phosphatgestein,
- Ammoniak,
- Harnstoff,
- Stickstoffdünger,
- Kalidünger.

Spielerische Entsprechung für die Demo-Philosophie:

```text
Lehm → Baurohstoffe
Holz → Forstprodukte
Stroh/Getreide → Agrarrohstoffe
Schaf → Biomasse, Tierprodukte, Textilfasern
Erz → Metallrohstoffe
```

Das ist nicht nur ein Witz. Es ist ein gutes didaktisches Modell.

---

## 21. Quellenliste

- Centre d’Études Prospectives et d’Informations Internationales Base pour l’Analyse du Commerce International: <https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html>
- United Nations Comtrade Database: <https://comtrade.un.org/>
- deck.gl documentation: <https://deck.gl/>
- flowmap.gl documentation: <https://flowmap.gl/docs/intro/>
- Food and Agriculture Organization of the United Nations Statistical Database: <https://www.fao.org/faostat/>
- International Energy Agency World Energy Balances: <https://www.iea.org/data-and-statistics/data-product/world-energy-balances>
- United States Geological Survey Mineral Commodity Summaries: <https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries>
- British Geological Survey World Mineral Statistics: <https://www.bgs.ac.uk/mineralsuk/statistics/world-mineral-statistics/>

---

## 22. Akronym- und Abkürzungsverzeichnis

- **BACI** = Base pour l’Analyse du Commerce International.
- **CEPII** = Centre d’Études Prospectives et d’Informations Internationales.
- **CSV** = Comma-Separated Values, also kommaseparierte Textdateien.
- **DuckDB** = Name einer eingebetteten analytischen Datenbank; keine ausgeschriebene Abkürzung.
- **HS** = Harmonized System, genauer Harmonized Commodity Description and Coding System.
- **ISO** = International Organization for Standardization.
- **ISO-3** = dreibuchstabiger Ländercode nach Standard der International Organization for Standardization.
- **JSON** = JavaScript Object Notation.
- **LCA** = Life Cycle Assessment, auf Deutsch Lebenszyklusanalyse.
- **LCI** = Life Cycle Inventory, auf Deutsch Lebenszyklusinventar.
- **MRIO** = Multi-Regional Input-Output.
- **MVP** = Minimum Viable Product, also kleinstes sinnvoll nutzbares Produkt.
- **Parquet** = spaltenorientiertes Dateiformat für analytische Daten; kein Akronym.
- **README** = Read Me, also eine Einstiegserklärung für ein Projekt.
- **RGBA** = Red Green Blue Alpha, also Rot-Grün-Blau-Farbwerte plus Transparenzkanal.
- **UN** = United Nations, auf Deutsch Vereinte Nationen.
- **WebGL** = Web Graphics Library.
- **YAML** = YAML Ain’t Markup Language.

---

## 23. Kurzfassung für den nächsten Bauschritt

Der erste Bauschritt soll nicht bei der finalen Grafikengine beginnen, sondern beim modularen Datenkern. Das Kernmodell speichert Länder, Rohstoffe, Produktcodes, Brutto-Handelsflüsse und Nettoströme in klaren Tabellen. Darauf aufbauend erzeugt es neutrale Renderdaten. Die erste Karte darf mit einfachen Linien oder Bögen arbeiten, damit Daten und Architektur schnell geprüft werden können. Gleichzeitig wird die Struktur so vorbereitet, dass später Quellen, Senken, Transformationen, Auswertungen, Schockanalysen, Produktionssäulen und echte Partikel-Rauchfahnen ohne grundlegenden Umbau andocken können.

Leitsatz:

> Erst das Skelett. Dann die Muskeln. Dann die Rauchfahnen. Dann fliegt das Schaf.
