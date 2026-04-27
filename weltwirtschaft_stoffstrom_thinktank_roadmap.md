# Physische Weltwirtschaft als Stoffstrommodell

**Großer Fahrplan für einen möglichen Mini-Thinktank — zwinker, zwinker**  
**Stand:** 2026-04-26  
**Arbeitstitel:** *Siedler 2 auf Weltniveau, aber noch ohne Gebäude*

---

## 1. Grundidee

Die Weltwirtschaft wird normalerweise über Geld betrachtet: Preise, Bruttoinlandsprodukt, Handelswerte, Kapitalflüsse, Gewinne, Zinsen. Dieses Projekt dreht die Perspektive um.

Die Grundfrage lautet:

> Was passiert, wenn wir die Weltwirtschaft zuerst als physischen Stoffwechsel der Menschheit modellieren — also als Flüsse von Materie, Energie, Arbeit und später erst Geld?

Das Modell soll nicht zuerst fragen:

> Wer verdient wie viel?

Sondern:

> Was wird wo gefördert, geerntet, transportiert, verarbeitet, verbraucht, gelagert, verbrannt, verbaut oder weggeworfen?

Das ist der Kern: **nicht Geld als Weltmodell, sondern Materie und Energie als Weltmodell**. Geld kann später als zweite Folie über diese physische Struktur gelegt werden.

---

## 2. Mentales Bild

Das Projekt ist im Kern eine **Siedler-Ökonomie auf Weltmaßstab**:

- Holz, Erz, Kohle, Öl, Gas, Getreide, Soja, Phosphat, Kupfer, Aluminium, Stahl.
- Aus Rohstoffen werden Vorprodukte.
- Aus Vorprodukten werden Endprodukte.
- Energie hält das ganze bekloppte Karussell am Laufen.
- Handel verbindet die Knoten.
- Schocks pflanzen sich durch das Netz fort.

Oder kurz:

> Feuer, Eisen, Brot, Boden — plus Datenbank und ein bisschen Wahnsinn.

Das erste Ziel ist kein perfektes Weltmodell. Das erste Ziel ist ein **physischer Atlas der Weltwirtschaft**, der Stück für Stück zu einem simulierbaren Modell wächst.

---

## 3. Das einfachste Grundmodell

Das Grundmodell besteht aus vier Elementen:

```text
Quelle / Produktion
→ Handel / Transport
→ Transformation / Verarbeitung
→ Senke / Nutzung / Lager / Verlust
```

Noch abstrakter:

```text
Quellen + Handel + Transformationen = berechenbare Senken und Abhängigkeiten
```

Für einen einzelnen Rohstoff gilt näherungsweise:

```text
scheinbarer Inlandsverbrauch = inländische Produktion + Import - Export ± Lageränderung
```

Wichtig: Wenn wir **nur Handel** betrachten, sehen wir externe Abhängigkeiten und Handelsflüsse, aber noch nicht den gesamten Inlandsverbrauch. Ein Land kann riesige Mengen eines Rohstoffs selbst fördern und selbst verbrauchen; im reinen Handelsmodell wäre dieser Stoffwechsel unsichtbar.

Darum wird das Projekt bewusst geschichtet aufgebaut.

---

## 4. Modellschichten

### Schicht 1: Handelsatlas

**Frage:** Wer schickt was wohin?

Einheit:

```text
Exportland → Importland × Produkt × Jahr × Menge
```

Diese Schicht zeigt:

- globale Hauptströme,
- bilaterale Abhängigkeiten,
- Nettoexporte und Nettoimporte,
- Konzentration von Lieferanten,
- geopolitisch empfindliche Handelskorridore,
- direkte Exposition gegenüber Angebotsschocks.

Diese Schicht ist der erste **Minimal Viable Product**, also das kleinste sinnvoll nutzbare Produkt.

---

### Schicht 2: Quellen / Produktion / Extraktion

**Frage:** Wo entsteht der Stoff überhaupt?

Beispiele:

- Kohleförderung,
- Erdölförderung,
- Erdgasförderung,
- Kupferminen,
- Eisenerzminen,
- Bauxitförderung,
- Weizenproduktion,
- Sojaproduktion,
- Phosphatabbau.

Mit dieser Schicht kann man den scheinbaren Inlandsverbrauch berechnen:

```text
Produktion + Import - Export = scheinbarer Inlandsverbrauch
```

Damit entsteht aus dem Handelsatlas ein erstes Materialflussmodell.

---

### Schicht 3: Senken / Nutzung / Endverwendung

**Frage:** Wohin verschwindet der Stoff?

Mögliche Senken:

- Nahrung,
- Tierfutter,
- Industrieinput,
- Energieerzeugung,
- Bau,
- langlebige Kapitalstöcke,
- Lagerhaltung,
- Abfall,
- Emissionen.

Beispiel Landwirtschaft:

```text
Mais → Nahrung
Mais → Tierfutter
Mais → Bioethanol
Mais → Saatgut
Mais → Verluste
```

Die Senken sind teilweise berechenbar, aber nicht vollständig aus Handel allein ableitbar. Dafür braucht man Produktionsdaten, Nutzungsbilanzen und Prozesswissen.

---

### Schicht 4: Transformationen / Prozessketten

**Frage:** Wie wird ein Stoff in einen anderen Stoff verwandelt?

Beispiele:

```text
Bauxit → Aluminiumoxid → Primäraluminium → Walzprodukt → Autoteil
Eisenerz + Kohle/Koks → Stahl → Maschinen/Bau/Auto
Rohöl → Raffinerieprodukte → Kunststoff/Chemie/Transportkraftstoffe
Erdgas → Ammoniak → Stickstoffdünger → Getreide
Sojabohne → Sojaschrot → Tierfutter → Fleisch/Milch/Eier
```

Hier brauchen wir Transformationskoeffizienten:

```text
Inputvektor pro Prozess → Outputvektor + Verluste + Nebenprodukte
```

Beispiel abstrakt:

```text
Prozess: Aluminiumschmelze
Inputs: Aluminiumoxid, Elektrizität, Kohlenstoffanoden
Outputs: Primäraluminium, Kohlendioxid, Abwärme, Verluste
```

Diese Schicht ist mächtig, aber auch der Bossgegner. Hier fängt das CSV-Kind im Keller an, zurückzugucken.

---

### Schicht 5: Schocksimulation

**Frage:** Was passiert, wenn ein wichtiger Fluss ausfällt?

Beispiele:

- Straße von Hormus blockiert,
- Erdgasexporte brechen ein,
- Phosphatlieferungen fallen aus,
- Sojaexporte aus Südamerika sinken,
- Kupferangebot fällt um 20 Prozent,
- Heliumangebot fällt um 30 Prozent.

Ein einfaches Schockmodell kann zunächst so aussehen:

```text
1. Reduziere Exportkapazität eines Landes oder einer Region.
2. Berechne direkte Importlücke je Land.
3. Prüfe alternative Lieferanten im Handelsnetz.
4. Schätze Restlücke.
5. Markiere nachgelagerte Sektoren, wenn Prozessdaten vorhanden sind.
```

Später können Lager, Substitution, Preise, Produktionsrestriktionen und politische Priorisierung ergänzt werden.

---

## 5. Warum Handel zuerst?

Der erste saubere Schnitt ist **Trade-only**, also nur internationaler Warenhandel.

Das ist bewusst unvollständig, aber stark:

- Handelsdaten sind vergleichsweise gut verfügbar.
- Bilaterale Flüsse lassen sich direkt als Graph darstellen.
- Animationen erzeugen sofort Erkenntnis und Intuition.
- Abhängigkeiten werden sichtbar.
- Man kann erste Schocks testen, ohne die gesamte Weltwirtschaft zu modellieren.

Trade-only beantwortet nicht:

> Wie viel verbraucht ein Land insgesamt?

Sondern:

> Von wem hängt ein Land bei internationalen Lieferungen direkt ab?

Das ist eine andere Frage — aber eine sehr gute erste Frage.

---

## 6. Produktontologie und Prozessontologie

### 6.1 Produktontologie

Eine **Produktontologie** beschreibt, welche Waren oder Rohstoffe zu welchen Gruppen gehören.

Beispiel:

```text
Energie
  Kohle
  Rohöl
  raffinierte Erdölprodukte
  Erdgas und verflüssigtes Erdgas
  Elektrizität
```

Oder:

```text
Soja-Komplex
  Sojabohnen
  Sojaöl
  Sojaschrot und Ölkuchen
```

Warum brauchen wir das?

Weil ein Rohstoff oder Stoffkomplex selten nur ein einziger Produktcode ist. Ohne Produktontologie vergleichen wir irgendwann Äpfel, Diesel und heilige Tabellenkobolde.

Für den Handels-Minimalstart reicht eine **leichte Produktontologie**:

```text
Commodity-Gruppe → Produkt → Handelscode
```

---

### 6.2 Prozessontologie

Eine **Prozessontologie** beschreibt Umwandlungen.

Beispiel:

```text
Bauxitabbau
→ Aluminiumoxidraffination
→ Aluminiumschmelze
→ Aluminiumhalbzeug
→ Fahrzeugbau
```

Oder:

```text
Erdgas
→ Ammoniak
→ Harnstoff
→ Stickstoffdünger
→ Getreideproduktion
```

Diese Prozessontologie brauchen wir **noch nicht** im Handels-Minimalprodukt. Sie wird erst wichtig, wenn wir erklären wollen, wie ein Input in andere Güter übergeht.

Merksatz:

```text
Produktontologie: früh und leicht.
Prozessontologie: später und vorsichtig.
```

---

## 7. Datenquellen: Hauptlandschaft

Dieser Abschnitt löst Abkürzungen bewusst aus. Keine mystischen Buchstabensuppen ohne Schildchen.

### 7.1 Internationaler Warenhandel

#### Centre d’Études Prospectives et d’Informations Internationales — Base pour l’Analyse du Commerce International

Kurzname: **Centre d’Études Prospectives et d’Informations Internationales Base pour l’Analyse du Commerce International (CEPII BACI)**.

Rolle:

- wichtigste Startquelle für den Handels-Minimalstart,
- bilateraler Warenhandel,
- Produktniveau nach dem Harmonized Commodity Description and Coding System auf sechsstelliger Ebene,
- ungefähr 200 Länder,
- ungefähr 5000 Produktkategorien,
- enthält Handelswert und Menge.

Quelle: [CEPII BACI-Dokumentation](https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html)

#### United Nations Comtrade Database

Kurzname: **United Nations Comtrade (UN Comtrade)**.

Rolle:

- globale Handelsdatenbank der Vereinten Nationen,
- jährliche und monatliche Warenhandelsdaten,
- wichtig für spätere Monatsauflösung,
- nützlich als Vergleich und Quelle für aktuellere oder detailliertere Abfragen.

Quelle: [United Nations Comtrade](https://comtrade.un.org/)

---

### 7.2 Materialflussrechnung

#### United Nations Environment Programme — International Resource Panel — Global Material Flows Database

Kurzname: **United Nations Environment Programme International Resource Panel Global Material Flows Database (UNEP IRP Global Material Flows Database)**.

Rolle:

- Top-down-Rahmen für globale Materialentnahme, Materialhandel und Materialverbrauch,
- gut für grobe physische Größenordnungen,
- wichtig für Domestic Material Consumption, also inländischen Materialverbrauch.

Quelle: [United Nations Environment Programme International Resource Panel Global Material Flows Database](https://www.resourcepanel.org/global-material-flows-database)

#### Eurostat Economy-wide Material Flow Accounts

Rolle:

- europäische Materialflusskonten,
- methodisch nützlich für Begriffe wie Domestic Extraction, Imports, Exports und Domestic Material Consumption.

Quelle: [Eurostat Material Flow Accounts](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Material_flow_accounts_and_resource_productivity)

---

### 7.3 Landwirtschaft, Nahrung, Futter, Fläche

#### Food and Agriculture Organization of the United Nations Statistical Database

Kurzname: **Food and Agriculture Organization of the United Nations Statistical Database (FAOSTAT)**.

Rolle:

- Agrarproduktion,
- Ernteflächen,
- Viehbestand,
- Lebensmittelbilanzen,
- Handel und Versorgung,
- über 245 Länder und Territorien.

Quelle: [FAOSTAT](https://www.fao.org/faostat/)

#### Food Balance Sheets der Food and Agriculture Organization of the United Nations

Rolle:

- Zuordnung von landwirtschaftlichen Produkten zu Nahrung, Tierfutter, Saatgut, Verarbeitung, Verlusten und anderen Nutzungen,
- zentral für Fragen wie: „Wie viel Soja wird als Tierfutter verwendet?“

Quelle: [Food Balance Sheets 2010–2023, Food and Agriculture Organization of the United Nations](https://www.fao.org/statistics/highlights-archive/highlights-detail/food-balance-sheets-2010-2023/en)

---

### 7.4 Mineralien, Metalle, kritische Rohstoffe

#### United States Geological Survey Mineral Commodity Summaries

Kurzname: **United States Geological Survey Mineral Commodity Summaries (USGS Mineral Commodity Summaries)**.

Rolle:

- jährliche Übersichten zu mehr als 90 nichtenergetischen Mineralien und Materialien,
- Produktion, Reserven, Ressourcen, Handelsaspekte und Länderinformationen,
- sehr geeignet für Quellen- und Engpassanalyse.

Quelle: [United States Geological Survey Mineral Commodity Summaries 2026](https://www.usgs.gov/publications/mineral-commodity-summaries-2026)

#### British Geological Survey World Mineral Production

Kurzname: **British Geological Survey World Mineral Production (BGS World Mineral Production)**.

Rolle:

- Länderproduktion für mehr als 70 mineralische Rohstoffe,
- sehr nützliche Zweitquelle neben dem United States Geological Survey.

Quelle: [British Geological Survey World Mineral Statistics](https://www.bgs.ac.uk/mineralsuk/statistics/world-mineral-statistics/)

---

### 7.5 Energie

#### International Energy Agency World Energy Balances

Kurzname: **International Energy Agency World Energy Balances (IEA World Energy Balances)**.

Rolle:

- Energiebilanzen für Länder und Regionen,
- Einheiten unter anderem thousand tonnes of oil equivalent, also tausend Tonnen Öläquivalent, und terajoules, also Terajoule,
- sehr wichtig für Energie als eigene Modellschicht.

Quelle: [International Energy Agency World Energy Balances](https://www.iea.org/data-and-statistics/data-product/world-energy-balances)

#### Joint Organisations Data Initiative Oil and Gas Databases

Kurzname: **Joint Organisations Data Initiative (JODI)**.

Rolle:

- monatliche Öl- und Gasdaten,
- nützlich für zeitlich feinere Energieanalyse.

Quelle: [Joint Organisations Data Initiative](https://www.jodidata.org/)

---

### 7.6 Industrieproduktion

#### United Nations Industrial Development Organization Industrial Statistics Database

Kurzname: **United Nations Industrial Development Organization Industrial Statistics Database (UNIDO INDSTAT)**.

Rolle:

- industrielle Produktionsdaten,
- Manufacturing, Mining und Utilities,
- später wichtig für Quellen- und Transformationsschichten.

Quelle: [United Nations Industrial Development Organization Statistics](https://stat.unido.org/)

#### Eurostat PRODCOM

PRODCOM steht für **Production Communautaire**, also Gemeinschaftsproduktion.

Rolle:

- europäische Produktionsstatistiken für hergestellte Güter,
- Mengen und Werte verkaufter Produktion,
- nützlich für europäische Detailanalysen.

Quelle: [Eurostat PRODCOM](https://ec.europa.eu/eurostat/web/prodcom)

---

### 7.7 Lieferketten-Skelett über Input-Output-Tabellen

#### Multi-Regional Input-Output

Kurzname: **Multi-Regional Input-Output (MRIO)**.

Ein Multi-Regional-Input-Output-Modell beschreibt, wie Sektoren in verschiedenen Ländern einander Vorleistungen liefern und wie diese Vorleistungen in Endnachfrage übergehen. Häufig ist das monetär, aber mit Umwelt- und Rohstoffsatelliten kann daraus ein grober Lieferketten- und Ressourcenfußabdruck entstehen.

Wichtige Quellen:

- **EXIOBASE**: globale, detaillierte Multi-Regional Environmentally Extended Supply-Use Table and Input-Output Table, also umwelt-erweiterte Angebots-Verwendungs- und Input-Output-Tabellen. Quelle: [EXIOBASE](https://exiobase.eu/)
- **Eora Global Supply Chain Database**: globale Multi-Regional-Input-Output-Datenbank mit breiter Länderabdeckung. Quelle: [Eora Global Supply Chain Database](https://worldmrio.com/)
- **Global Resource Input-Output Assessment (GLORIA)**: globale Input-Output-Datenbank für Ressourcen- und Umweltanalysen. Quelle: [Global Resource Input-Output Assessment](https://ielab.info/resources/gloria/about)
- **World Input-Output Database (WIOD)**: World-Input-Output-Datenbank für globale Wertschöpfungsketten. Quelle: [World Input-Output Database](https://www.rug.nl/ggdc/valuechain/wiod/)
- **Organisation for Economic Co-operation and Development Inter-Country Input-Output Tables (OECD ICIO)**: internationale Input-Output-Tabellen der Organisation für wirtschaftliche Zusammenarbeit und Entwicklung. Quelle: [Organisation for Economic Co-operation and Development Inter-Country Input-Output Tables](https://www.oecd.org/sti/ind/inter-country-input-output-tables.htm)

Rolle im Projekt:

- nicht Startpunkt,
- aber später sehr nützlich, wenn aus Rohstoffflüssen sektorale Lieferketteneffekte werden sollen.

---

### 7.8 Prozess- und Lebenszyklusdaten

#### Life Cycle Assessment

Kurzname: **Life Cycle Assessment (LCA)**, auf Deutsch Lebenszyklusanalyse.

Rolle:

- Prozessdaten,
- Material- und Energieinputs pro Produktionseinheit,
- Emissionen, Nebenprodukte und Verluste.

Wichtige Quellen:

- **ecoinvent Database**: umfangreiche Lebenszyklusinventar-Datenbank. Quelle: [ecoinvent Database](https://ecoinvent.org/database/)
- **openLCA Nexus**: Plattform für Lebenszyklusdatenbanken, nutzbar mit der Software openLCA. Quelle: [openLCA Nexus](https://nexus.openlca.org/)
- **United States Life Cycle Inventory Database (USLCI)**: US-amerikanische Lebenszyklusinventar-Daten. Quelle: [United States Life Cycle Inventory Database](https://www.nrel.gov/lci/)
- **Greenhouse gases, Regulated Emissions, and Energy use in Technologies Model (GREET Model)**: Modell für Treibhausgase, regulierte Emissionen und Energieeinsatz in Technologien, besonders relevant für Energie- und Fahrzeugpfade. Quelle: [GREET Model, Argonne National Laboratory](https://greet.anl.gov/)

Rolle im Projekt:

- wichtig für Transformationen,
- aber erst nach dem Handelsatlas und der Produktionsschicht.

---

## 8. Erste Rohstoff- und Produktgruppen

### Energie

- Kohle
- Rohöl
- raffinierte Erdölprodukte
- Erdgas und verflüssigtes Erdgas
- Elektrizität

### Metalle und Industrie

- Eisenerz
- Stahl und Eisenhalbwaren
- Bauxit
- Aluminiumoxid
- Primäraluminium
- Kupfererz
- raffiniertes Kupfer
- Nickel
- Kobalt
- Lithium
- Graphit

### Landwirtschaft, Nahrung, Futter

- Weizen
- Mais
- Reis
- Sojabohnen
- Sojaschrot und Ölkuchen
- Pflanzenöle
- Fleisch optional später

### Dünger und Bodenfruchtbarkeit

- Phosphatgestein
- Kalidünger
- Stickstoffdünger
- Ammoniak
- Harnstoff

---

## 9. Technologischer Pfad

### 9.1 Datenhaltung

Empfohlener Start:

- Rohdaten als Comma-Separated Values, also CSV-Dateien, oder Parquet-Dateien.
- Verarbeitung mit Python.
- Tabellenanalyse mit pandas oder Polars.
- lokale analytische Datenbank mit DuckDB.
- saubere Konfiguration über JavaScript Object Notation, also JSON, oder YAML Ain’t Markup Language, also YAML.

### 9.2 Visualisierung

Für animierte Flüsse:

- **deck.gl**: Web Graphics Library-basierte Visualisierungsbibliothek für große Geodatenmengen. Web Graphics Library bedeutet WebGL.
- **flowmap.gl**: auf Flusskarten spezialisierte Visualisierungsbibliothek für Bewegungen zwischen Orten.
- **pydeck**: Python-Anbindung für deck.gl.
- Optional später: Observable Framework oder eine eigene kleine Webanwendung mit JavaScript und TypeScript.

### 9.3 Erste Anwendung

Mögliche Form:

- Jupyter Notebook für Datenprüfung,
- Python-Skript für Datenaufbereitung,
- DuckDB-Datenbank für Abfragen,
- Streamlit-Dashboard für schnelle Exploration,
- später Webkarte mit deck.gl oder flowmap.gl.

---

## 10. Roadmap

### Phase 0: Projektkern festlegen

Ziel:

- Begriffsklärung,
- Datenquellen auswählen,
- Produktgruppen definieren,
- minimale Produktontologie bauen.

Ergebnis:

- dieses Roadmap-Dokument,
- Handels-Minimalprodukt-Dokument,
- erste Commodity-Liste.

---

### Phase 1: Handels-Minimalprodukt

Ziel:

- bilaterale Handelsflüsse aus CEPII BACI laden,
- ausgewählte Rohstoffe und Produkte filtern,
- Länder und Produktcodes harmonisieren,
- Top-Flüsse berechnen,
- animierte Weltkarte erstellen.

Ergebnis:

- Global Commodity Trade Atlas Version 0.1.

---

### Phase 2: Trade Exposure Dashboard

Ziel:

- Importabhängigkeiten sichtbar machen,
- Lieferantenkonzentration berechnen,
- Top-Exporteure und Top-Importeure anzeigen,
- einfache Schocks testen.

Metriken:

- Importanteil je Lieferant,
- Exportanteil je Zielmarkt,
- Herfindahl-Hirschman Index, also Konzentrationsmaß,
- Nettoimport und Nettoexport,
- Anzahl alternativer Lieferanten.

---

### Phase 3: Produktions- und Quellenlayer

Ziel:

- Förderung und Erzeugung ergänzen,
- scheinbaren Inlandsverbrauch berechnen,
- Handelsflüsse gegen reale Produktion setzen.

Datenquellen:

- Food and Agriculture Organization of the United Nations Statistical Database,
- United States Geological Survey Mineral Commodity Summaries,
- British Geological Survey World Mineral Production,
- International Energy Agency World Energy Balances.

---

### Phase 4: Nutzung und Senken

Ziel:

- Nahrung, Tierfutter, Industrie, Energie und Bau getrennt betrachten,
- Food Balance Sheets für Agrarprodukte integrieren,
- Energie- und Materialbilanzen koppeln.

---

### Phase 5: Prozessketten

Ziel:

- zentrale Umwandlungen modellieren,
- Input-Output-Koeffizienten sammeln,
- Prozessketten für Stahl, Aluminium, Dünger, Ölprodukte und Agrarprodukte bauen.

---

### Phase 6: Schocksimulation

Ziel:

- Angebotsausfälle simulieren,
- direkte und indirekte Effekte berechnen,
- Verwundbarkeit von Ländern und Sektoren darstellen.

Beispiele:

- Rohölschock im Persischen Golf,
- Düngerschock,
- Kupferschock,
- Sojaschock,
- Helium- oder Neon-Schock.

---

## 11. Nicht-Ziele für den Anfang

Am Anfang ausdrücklich nicht:

- keine vollständige Weltwirtschaftssimulation,
- keine Preisbildung,
- keine monetären Input-Output-Modelle als Hauptmodell,
- keine vollständigen Seewege,
- keine echten Schiffsrouten,
- keine Lagerdynamik,
- keine Substitutionselastizitäten,
- keine vollständige Prozessontologie.

Kurz:

> Nicht direkt Mordor in pandas bauen.

---

## 12. Wichtigste Architekturentscheidung

Der Trade-Layer bleibt eigenständig.

Das ist entscheidend. Wir bauen nicht sofort ein untrennbares Monster aus Handel, Produktion, Nutzung, Prozessen und Geld. Stattdessen entstehen klar getrennte Layer:

```text
Layer 1: Handel
Layer 2: Produktion und Extraktion
Layer 3: scheinbarer Inlandsverbrauch
Layer 4: Nutzung und Senken
Layer 5: Transformationen
Layer 6: Schocksimulation
Layer 7: monetäre Gegenfolie
```

So bleibt das Modell erweiterbar, prüfbar und intellektuell sauber.

---

## 13. Leitmotto

> Ein Rohstoff. Ein Jahr. Eine Datenquelle. Ein Graph. Dann wächst der Drache.

Das ist die praktische Ethik des Projekts. Groß denken, klein bauen, sauber prüfen. Keine Daten-Schaumschlägerei, kein Dashboard-Theater, keine PowerPoint-Kreise mit „Transformation“ in der Mitte.

Erst physische Welt sehen. Dann verstehen. Dann simulieren.



---

## 14. Akronym- und Abkürzungsverzeichnis

- **BACI** = Base pour l’Analyse du Commerce International, Handelsdatenbank des Centre d’Études Prospectives et d’Informations Internationales.
- **BGS** = British Geological Survey.
- **CEPII** = Centre d’Études Prospectives et d’Informations Internationales.
- **CSV** = Comma-Separated Values, also kommaseparierte Textdateien.
- **EXIOBASE** = Environmentally Extended Input-Output Database, Projektname einer umwelt-erweiterten Multi-Regional-Input-Output-Datenbank.
- **FAOSTAT** = Food and Agriculture Organization of the United Nations Statistical Database.
- **GLORIA** = Global Resource Input-Output Assessment.
- **GREET** = Greenhouse gases, Regulated Emissions, and Energy use in Technologies Model.
- **ICIO** = Inter-Country Input-Output Tables.
- **IEA** = International Energy Agency.
- **INDSTAT** = Industrial Statistics Database der United Nations Industrial Development Organization.
- **IRP** = International Resource Panel.
- **JODI** = Joint Organisations Data Initiative.
- **JSON** = JavaScript Object Notation.
- **LCA** = Life Cycle Assessment, auf Deutsch Lebenszyklusanalyse.
- **MRIO** = Multi-Regional Input-Output.
- **OECD** = Organisation for Economic Co-operation and Development.
- **PRODCOM** = Production Communautaire, europäische Statistik zur Gemeinschaftsproduktion.
- **UN** = United Nations, auf Deutsch Vereinte Nationen.
- **UNEP** = United Nations Environment Programme.
- **UNIDO** = United Nations Industrial Development Organization.
- **US** = United States.
- **USGS** = United States Geological Survey.
- **USLCI** = United States Life Cycle Inventory Database.
- **WIOD** = World Input-Output Database.
- **YAML** = YAML Ain’t Markup Language.
