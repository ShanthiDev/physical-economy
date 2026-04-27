# MVP.md – Änderungskapitel: Prozesse, Transformationsmatrix und Technologieentscheidungen

**Stand:** 2026-04-26  
**Zweck:** Dieses Dokument enthält nur die Kapitel bzw. Kapitelergänzungen, die in `MVP.md` ersetzt oder ergänzt werden sollen. Der Rest des bestehenden Dokuments kann unverändert bleiben.

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

## 19. Erweiterungslogik nach Version 0.1

Dieser Abschnitt ersetzt nur den bisherigen Abschnitt zur Transformations-Erweiterung und kann in Kapitel 19 übernommen werden.

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

## 22. Ergänzung zum Akronym- und Abkürzungsverzeichnis

Folgende Einträge ergänzen oder präzisieren das bestehende Verzeichnis:

- **DuckDB** = Name einer eingebetteten analytischen SQL-Datenbank; keine ausgeschriebene Abkürzung.
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

