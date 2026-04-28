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

Layer 4 beschreibt, wie Inputs und Outputs durch reale oder modellierte Produktionsprozesse miteinander gekoppelt sind.

Der entscheidende Modellierungsgrundsatz lautet:

> Ein Prozess ist kein einfacher Pfeil von Input zu Output. Ein Prozess ist eine Multi-Input/Multi-Output-Transformation.

Beispiele:

- Eisenerz + Kohle/Koks + Kalkstein → Stahl + Schlacke + Kohlendioxid
- Rohöl → Diesel + Benzin + Kerosin + Naphtha + Schweröl + Raffineriegas
- Sojabohnen → Sojaschrot + Sojaöl + Verluste
- Erdgas → Ammoniak → Harnstoff
- Bauxit → Aluminiumoxid → Primäraluminium
- 3 Erz + 2 Getreide → 1 Stadt, falls der Siedler-Gott gnädig ist

Dieser Layer wird noch nicht in Version 0.1 vollständig gebaut, aber seine Struktur wird jetzt so vorbereitet, dass spätere Prozessketten, Schockanalysen und Substitutionsmodelle andocken können.

---

### 9.1 Warum keine einfache Commodity-zu-Commodity-Matrix?

Eine naheliegende Idee wäre eine Matrix der Form:

    Input-Commodity × Output-Commodity

Das klingt zunächst elegant: Man nimmt einen Commodity-Vektor, multipliziert ihn mit einer Matrix und erhält einen Output-Vektor.

Das Problem: Eine solche Matrix kann nicht sauber ausdrücken, dass mehrere Inputs gemeinsam im richtigen Verhältnis gebraucht werden.

Beispiel:

    3 Erz + 2 Getreide → 1 Stadt

Eine einfache Commodity-zu-Output-Matrix würde so tun, als trage Erz allein schon „ein bisschen Stadt“ bei und Getreide allein ebenfalls. Dann könnte bei 6 Erz und 0 Getreide rechnerisch trotzdem Stadt entstehen. Das ist falsch.

Das Rezept ist keine additive Einzelwirkung, sondern eine UND-Bedingung:

    Erz UND Getreide im richtigen Verhältnis.

Deshalb ist der robustere Ansatz:

> Nicht Commodities werden direkt in Outputs transformiert, sondern Prozesse laufen in bestimmter Aktivität und verändern die Bestände der Commodities.

---

### 9.2 Stöchiometrisches Prozessmodell

Der Transformationslayer wird als stöchiometrisches Prozessmodell gedacht.

**Stöchiometrisch** bedeutet hier: Eine Prozessspalte beschreibt, welche Mengen von welchen Commodities verbraucht und welche Mengen erzeugt werden.

Grundstruktur:

    q_neu = q_alt + Sx

Dabei gilt:

- `q_alt` = alter Commodity-Bestandsvektor,
- `q_neu` = neuer Commodity-Bestandsvektor,
- `S` = Transformations- oder Prozessmatrix,
- `x` = Aktivitätsvektor der Prozesse,
- `Sx` = Nettoänderung der Commodity-Bestände.

Die Matrix `S` hat die Dimension:

    Anzahl Commodities × Anzahl Prozesse

Also:

- Zeilen = Commodities,
- Spalten = Prozesse,
- negative Einträge = Inputs,
- positive Einträge = Outputs, Nebenprodukte, Abfälle oder Emissionen.

Ein einzelner Prozess ist damit eine Spalte dieser Matrix. Alle Prozesse zusammen bilden die Transformationsmatrix.

---

### 9.3 Beispiel: Catan-Stadt als Prozessspalte

Commodities:

- Erz,
- Getreide,
- Stadt.

Prozess:

    3 Erz + 2 Getreide → 1 Stadt

Prozessspalte:

| Commodity | Koeffizient |
|---|---:|
| Erz | -3 |
| Getreide | -2 |
| Stadt | +1 |

Wenn der Prozess viermal läuft, ist die Prozessaktivität:

    x_stadtbau = 4

Dann ergibt sich:

| Commodity | Änderung |
|---|---:|
| Erz | -12 |
| Getreide | -8 |
| Stadt | +4 |

Die Bestände werden also nicht durch einen Commodity-Inputvektor in Outputs verwandelt. Stattdessen wird ein Prozessplan auf die Bestände angewendet.

---

### 9.4 Beispiel: Sojabohnen-Crushing

Prozess:

    1.00 t Sojabohnen → 0.78 t Sojaschrot + 0.18 t Sojaöl + 0.04 t Verluste

Prozessspalte:

| Commodity | Koeffizient |
|---|---:|
| Sojabohnen | -1.00 |
| Sojaschrot | +0.78 |
| Sojaöl | +0.18 |
| Verluste | +0.04 |

Wenn der Prozess 1.000-mal läuft, werden verbraucht bzw. erzeugt:

| Commodity | Änderung |
|---|---:|
| Sojabohnen | -1.000 t |
| Sojaschrot | +780 t |
| Sojaöl | +180 t |
| Verluste | +40 t |

Wichtig: Wenn man auf 1 Tonne Sojaöl normiert, entsteht trotzdem Sojaschrot als Co-Produkt. Eine Output-Normierung ist nur eine andere Sicht auf denselben Prozess, aber sie darf die anderen Outputs nicht unterschlagen.

---

### 9.5 Aktivitätsvektor und Constraints

Der Aktivitätsvektor `x` beschreibt, wie oft oder wie stark ein Prozess läuft.

Beispiele:

| Prozess | Aktivität |
|---|---:|
| Stadtbau | 4 |
| Sojabohnen-Crushing | 1.000 |
| Stahlproduktion Hochofenroute | 500 |
| Rohölraffination | 2.000 |

Ein Prozessplan ist nur möglich, wenn die Inputs ausreichen.

Beispiel Stadt:

    Erzbestand - 3 × x_stadtbau ≥ 0
    Getreidebestand - 2 × x_stadtbau ≥ 0

Daraus folgt:

    x_stadtbau ≤ Erzbestand / 3
    x_stadtbau ≤ Getreidebestand / 2

Das ist der Punkt, an dem aus linearer Algebra Produktionsplanung wird. Für einfache Fälle reicht eine Minimum-Regel. Für komplexere Fälle braucht man später Nebenbedingungen, Kapazitäten und lineare Optimierung.

---

### 9.6 Normierungen

Ein Prozess kann unterschiedlich normiert beschrieben werden.

Beispiel Sojabohnen-Crushing:

Input-normiert:

    1.00 t Sojabohnen → 0.78 t Sojaschrot + 0.18 t Sojaöl + 0.04 t Verluste

Output-normiert auf 1 t Sojaöl:

    5.56 t Sojabohnen → 4.33 t Sojaschrot + 1.00 t Sojaöl + 0.22 t Verluste

Beide Darstellungen beschreiben denselben physischen Prozess. Sie sind nur unterschiedlich skaliert.

Architekturentscheidung:

> Gespeichert wird eine Referenznormierung pro Prozess. Andere Normierungen werden als Views oder abgeleitete Tabellen erzeugt.

Bei Multi-Output-Prozessen muss jede Output-Normierung die Co-Produkte, Nebenprodukte, Verluste und Emissionen mitführen. Sonst tut das Modell so, als könne man Sojaöl ohne Sojaschrot erzeugen oder Diesel ohne andere Raffinerieprodukte. Das wäre Tabellenzauberei mit Betrugsabsicht.

---

### 9.7 Tabellenstruktur für Prozesse

Die frühere Aufteilung in getrennte Tabellen `process_inputs` und `process_outputs` wird ersetzt durch:

- `processes`,
- `process_flows`.

Diese Struktur ist allgemeiner, matrixfähig und reduziert Doppelungen.

#### Tabelle: `processes`

| Feld | Bedeutung |
|---|---|
| `process_id` | eindeutige Prozess-ID |
| `process_name` | Name des Prozesses |
| `process_group` | Prozessgruppe, zum Beispiel Stahl, Raffinerie, Soja, Dünger |
| `technology_variant` | Technologievariante, zum Beispiel Hochofenroute oder Elektroofenroute |
| `region` | Region oder Land, für das der Prozess gilt |
| `reference_commodity_id` | Commodity, auf die der Prozess normiert ist |
| `reference_quantity` | Referenzmenge |
| `reference_unit_id` | Einheit der Referenzmenge |
| `valid_from` | Gültig ab Jahr |
| `valid_to` | Gültig bis Jahr |
| `source_dataset` | Datenquelle |
| `source_version` | Version der Datenquelle |
| `notes` | methodische Hinweise |

#### Tabelle: `process_flows`

| Feld | Bedeutung |
|---|---|
| `process_flow_id` | eindeutige Flow-ID |
| `process_id` | zugehöriger Prozess |
| `commodity_id` | betroffene Commodity |
| `flow_role` | Rolle im Prozess |
| `coefficient` | Menge pro Referenzaktivität, mit Vorzeichen |
| `unit_id` | Einheit |
| `is_required_input` | markiert zwingende Inputs |
| `is_coproduct` | markiert Co-Produkte |
| `is_residual` | markiert Residualgrößen, Verluste oder Abfall |
| `uncertainty_level` | grobe Unsicherheitsmarkierung |
| `source_dataset` | Datenquelle |
| `source_version` | Version der Datenquelle |
| `notes` | methodische Hinweise |

Mögliche Werte für `flow_role`:

| Wert | Bedeutung |
|---|---|
| `input` | materieller Input |
| `energy_input` | Energieinput |
| `output` | Hauptoutput |
| `coproduct` | Co-Produkt |
| `byproduct` | Nebenprodukt |
| `waste` | Abfall |
| `emission` | Emission |
| `loss` | Verlust |
| `stock_addition` | Einbau in Bestand |

Konvention:

- Inputs werden negativ gespeichert.
- Outputs, Nebenprodukte, Abfälle und Emissionen werden positiv gespeichert.
- Die Interpretation erfolgt über `flow_role`.

---

### 9.8 Alternative Technologien statt freie Substitution

Substitution wird in frühen Versionen nicht als freie Elastizität modelliert.

Nicht zuerst:

    200 kg Steinkohle ODER 400 kg Braunkohle ersetzen sich dynamisch je nach Knappheit.

Sondern zuerst:

    Rezept A: Stahl über Hochofenroute
    Rezept B: Stahl über Elektroofenroute
    Rezept C: Stahl über Direktreduktion

Jede Technologievariante ist ein eigener Prozess mit eigener Prozessspalte.

Später kann man Technologieanteile modellieren:

    Land X nutzt 70 Prozent Hochofenroute und 30 Prozent Elektroofenroute.

Noch später kann man Kapazitäten, Kosten, Substitution und Inelastizitäten modellieren. Das ist dann nicht mehr MVP, sondern Thinktank mit Schlafmangel.

---

### 9.9 Speicherung als Long Table statt Dense Matrix

Die Transformationsmatrix ist sehr leer.

Wenn es 5.000 Commodities und 10.000 Prozesse gibt, hätte eine dichte Matrix theoretisch 50 Millionen Einträge. Die meisten davon wären null.

Deshalb wird die Matrix nicht als volle Tabelle gespeichert, sondern als Long Table:

| process_id | commodity_id | coefficient |
|---|---|---:|
| `soybean_crushing` | `soybeans` | -1.00 |
| `soybean_crushing` | `soybean_meal` | +0.78 |
| `soybean_crushing` | `soybean_oil` | +0.18 |
| `soybean_crushing` | `losses` | +0.04 |
| `steel_blast_furnace` | `iron_ore` | -1.60 |
| `steel_blast_furnace` | `coking_coal` | -0.60 |
| `steel_blast_furnace` | `steel` | +1.00 |

Bei Bedarf kann daraus eine Sparse Matrix erzeugt werden.

**Sparse Matrix** bedeutet dünn besetzte Matrix: Es werden nur die Nicht-Null-Einträge gespeichert. Das ist für große, leere Matrizen wesentlich effizienter.

---

### 9.10 Rolle im Projektpfad

Für Version 0.1 wird der Transformationslayer noch nicht vollständig implementiert. Aber das Datenmodell wird so entworfen, dass es später diese Logik tragen kann.

Stufenplan:

1. Version 0.1: Handelslayer und Nettoströme.
2. Version 0.2: Renderdaten und einfache Visualisierung.
3. Version 0.3: Quellen- und Produktionslayer.
4. Version 0.4: Senken und scheinbarer Inlandsverbrauch.
5. Version 0.5: direkte Schockanalyse im Handelsgraphen.
6. Version 0.6: erste kleine Prozessmatrix für wenige ausgewählte Transformationsketten.

Erste geeignete Prozessketten:

- Sojabohnen → Sojaschrot + Sojaöl,
- Rohöl → Raffinerieproduktmix,
- Eisenerz + Kohle/Koks + Kalkstein → Stahl + Nebenprodukte + Emissionen,
- Erdgas → Ammoniak → Harnstoff,
- Bauxit → Aluminiumoxid → Primäraluminium,
- Weizen → Mehl + Kleie.

Leitsatz:

> Ein Prozess ist eine Maschine. Die Matrix sagt, was passiert, wenn Maschinen laufen. Die Constraints sagen, ob die Realität mitspielt.

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

Dieser Abschnitt präzisiert die Technologieentscheidung. Das Ziel ist nicht, möglichst viele neue Tools einzuführen. Das Ziel ist ein robuster, lernbarer und erweiterbarer Datenpfad.

---

### 13.1 Grundentscheidung: SQL-first, pandas-freundlich, optional schneller

Für den ersten Bauabschnitt gilt:

- SQL bleibt zentral.
- pandas bleibt das primäre Explorationswerkzeug.
- DuckDB wird als lokale analytische SQL-Engine empfohlen.
- Polars bleibt optional und wird erst eingeführt, wenn pandas oder DuckDB für bestimmte Transformationen unbequem oder langsam werden.
- MySQL oder MariaDB bleiben möglich, sind aber für den ersten analytischen Datenbau nicht zwingend.

**SQL** steht für **Structured Query Language**, also strukturierte Abfragesprache für relationale Datenbanken.

---

### 13.2 DuckDB

**DuckDB** ist eine eingebettete analytische SQL-Datenbank. Man kann sie grob als „SQLite für analytische Datenverarbeitung“ verstehen.

**SQLite** ist eine kleine eingebettete relationale Datenbank. DuckDB ist ähnlich bequem lokal nutzbar, aber stärker auf analytische Abfragen ausgelegt.

Geeignet für:

- große CSV-Dateien,
- Parquet-Dateien,
- Joins,
- Gruppierungen,
- Aggregationen,
- analytische SQL-Abfragen,
- reproduzierbare lokale Pipelines.

Warum DuckDB für dieses Projekt gut passt:

- CEPII-BACI-Dateien können groß werden.
- Wir müssen nach Produktcodes filtern.
- Wir müssen Länder und Commodity-Mappings joinen.
- Wir müssen Brutto- und Nettoströme aggregieren.
- Wir wollen SQL üben, ohne sofort Serveradministration zu betreiben.

Empfohlene Rolle:

    DuckDB = analytische Arbeitsdatenbank für lokale Verarbeitung

Nicht zwingend endgültiges Backend.

---

### 13.3 MySQL oder MariaDB

**MySQL** ist eine serverbasierte relationale Datenbank. **MariaDB** ist ein aus MySQL hervorgegangenes, weitgehend kompatibles Datenbanksystem.

Geeignet für:

- klassische Webanwendungen,
- Benutzerverwaltung,
- Transaktionen,
- dauerhafte Serverdatenbanken,
- Backend-Systeme,
- Job-relevante SQL-Praxis.

Für dieses Projekt ist MySQL oder MariaDB möglich, aber nicht zwingend der beste erste Speicherort für große analytische Rohdaten.

Empfohlene Rolle:

    Phase 1: optional, nicht nötig
    Phase 2: mögliches Backend für eine Anwendung
    Phase 3: bewusstes SQL-Lernmodul oder Deployment-Datenbank

Pragmatischer Kompromiss:

> Die Transformationen werden möglichst SQL-nah formuliert. So bleibt der Lernwert hoch, auch wenn DuckDB statt MySQL verwendet wird.

---

### 13.4 pandas

**pandas** ist die vertraute Python-Bibliothek für tabellarische Datenanalyse.

Geeignet für:

- Exploration,
- kleine und mittlere Tabellen,
- Debugging,
- schnelle Prüfungen,
- Notebook-Arbeit,
- Visualisierungsvorbereitung.

Empfohlene Rolle:

    pandas = Explorations- und Kontrollwerkzeug

pandas bleibt im Projekt. Es wird nicht aus Tool-Geilheit ersetzt. Wir sind ja keine Barbaren mit Paketmanager-Fetisch.

---

### 13.5 Polars

**Polars** ist eine schnelle Dataframe-Bibliothek, ähnlich wie pandas, aber stärker auf spaltenorientierte Verarbeitung, Parallelisierung und Lazy Evaluation ausgelegt.

**Lazy Evaluation** bedeutet: Operationen werden zunächst als Ausführungsplan gesammelt und erst später optimiert ausgeführt.

Geeignet für:

- große tabellarische Transformationen,
- schnelle Filter und Gruppierungen,
- speichereffiziente Pipelines,
- Fälle, in denen pandas zu langsam oder zu speicherhungrig wird.

Empfohlene Rolle:

    Polars = optionaler Performance-Baustein

Nicht sofort nötig. Erst einführen, wenn ein konkretes Problem damit gelöst wird.

---

### 13.6 Sparse-Matrix-Werkzeuge

Für spätere Prozessmatrizen kann eine Sparse-Matrix-Bibliothek sinnvoll werden.

Wahrscheinliche Werkzeuge:

- NumPy,
- SciPy Sparse.

**NumPy** steht für **Numerical Python** und ist die zentrale Python-Bibliothek für numerische Arrays.  
**SciPy** steht für **Scientific Python** und bietet wissenschaftliche Rechenverfahren, darunter Sparse-Matrix-Strukturen.

Empfohlene Rolle:

    Long Tables in DuckDB oder pandas speichern
    bei Bedarf in scipy.sparse Matrix umwandeln
    Matrixoperationen nur dort nutzen, wo sie wirklich gebraucht werden

Für Version 0.1 ist das noch nicht notwendig.

---

### 13.7 Empfohlener Technologiepfad

Empfohlener Start:

1. Python für Skripte und Notebooks.
2. pandas für Exploration.
3. DuckDB für SQL-Abfragen, Joins und Aggregationen.
4. Parquet für größere verarbeitete Tabellen.
5. YAML für Konfigurationen.
6. deck.gl oder flowmap.gl für erste Visualisierung.

Später ergänzen:

1. Polars, wenn Performance nötig wird.
2. MySQL oder MariaDB, wenn eine serverbasierte Anwendung entsteht oder gezielt Backend-SQL geübt werden soll.
3. SciPy Sparse, wenn der Transformationslayer als echte Sparse Matrix gerechnet wird.
4. Eigene Partikelmaschine, wenn die Rauchfahnenvisualisierung gebaut wird.

**YAML** steht für **YAML Ain’t Markup Language**.  
**Parquet** ist ein spaltenorientiertes Dateiformat für analytische Datenverarbeitung.

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

### Version 0.6: Erste Prozessmatrix

- `processes` und `process_flows` einführen,
- wenige ausgewählte Multi-Input/Multi-Output-Prozesse modellieren,
- Prozessflüsse als Long Table speichern,
- Vorzeichenkonvention einhalten: Inputs negativ, Outputs positiv,
- einfache Prozessaktivitäten berechnen,
- prüfen, ob Inputs ausreichen,
- noch keine freie Substitution und keine Preisreaktionen modellieren.

Beispielprozesse:

- Sojabohnen-Crushing,
- Rohölraffination,
- Stahlproduktion über Hochofenroute,
- Weizenvermahlung,
- Ammoniak- und Harnstoffproduktion,
- Aluminiumproduktion.

Ziel:

> Der Transformationslayer wird als sparse Commodity×Process-Matrix vorbereitet, aber nur mit wenigen gut verständlichen Prozessen getestet.

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

### 22.1 Ergänzung zum Akronym- und Abkürzungsverzeichnis

Folgende Einträge ergänzen oder präzisieren das bestehende Verzeichnis:

- **Lazy Evaluation** = verzögerte Auswertung; Operationen werden zunächst als Plan gesammelt und später optimiert ausgeführt.
- **MariaDB** = aus MySQL hervorgegangenes relationales Datenbanksystem; kein klassisches Akronym.
- **MySQL** = Name eines relationalen Datenbanksystems; SQL steht für Structured Query Language.
- **NumPy** = Numerical Python.
- **OLAP** = Online Analytical Processing, analytische Datenverarbeitung über große Datenmengen.
- **OLTP** = Online Transaction Processing, transaktionsorientierte Datenverarbeitung für viele kleine Lese- und Schreibvorgänge.
- **Polars** = Name einer schnellen Dataframe-Bibliothek; kein Akronym.
- **SciPy** = Scientific Python.
- **Sparse Matrix** = dünn besetzte Matrix, bei der nur Nicht-Null-Einträge gespeichert werden.
- **SQL** = Structured Query Language.
- **SQLite** = Name einer eingebetteten relationalen Datenbank; kein ausgeschriebenes Akronym.
- **Stöchiometrische Matrix** = Matrix, die für Prozesse oder Reaktionen festhält, welche Stoffe verbraucht und welche erzeugt werden.

---

## 23. Kurzfassung für den nächsten Bauschritt

Der erste Bauschritt soll nicht bei der finalen Grafikengine beginnen, sondern beim modularen Datenkern. Das Kernmodell speichert Länder, Rohstoffe, Produktcodes, Brutto-Handelsflüsse und Nettoströme in klaren Tabellen. Darauf aufbauend erzeugt es neutrale Renderdaten. Die erste Karte darf mit einfachen Linien oder Bögen arbeiten, damit Daten und Architektur schnell geprüft werden können. Gleichzeitig wird die Struktur so vorbereitet, dass später Quellen, Senken, Transformationen, Auswertungen, Schockanalysen, Produktionssäulen und echte Partikel-Rauchfahnen ohne grundlegenden Umbau andocken können.

Leitsatz:

> Erst das Skelett. Dann die Muskeln. Dann die Rauchfahnen. Dann fliegt das Schaf.
