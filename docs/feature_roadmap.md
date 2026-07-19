# Feature-Roadmap: Vom Handelsatlas zum physischen Weltatlas

**Produktdesign-Dokument — Prioritäten, UX/UI-Spezifikationen, Erweiterungspfad**
**Stand:** 2026-07-19
**Basis:** `weltwirtschaft_stoffstrom_thinktank_roadmap.md`, `MVP.md`, Stand des Repos nach v0.1 + drei Viz-Iterationen (Partikel-Plumes, Globus, Ländermap)
**Arbeitstitel:** *Erst sehen, dann staunen, dann verstehen, dann ableiten.*

---

## 1. Zweck und Einordnung

Dieses Dokument konsolidiert die Modell- und Feature-Prioritäten für die nächsten Ausbaustufen und spezifiziert die UX/UI so genau, dass daraus in einem Folgeschritt umsetzbare Arbeitspakete und Prompts gegossen werden können.

Es ist **Schritt 1 eines dreistufigen Prozesses**:

```text
Schritt 1 (dieses Dokument): Produkt-Prioritäten + Feature-Roadmap + UX/UI-Spezifikation
Schritt 2 (separat beauftragt): technische Bestandsaufnahme der bestehenden Architektur
Schritt 3 (danach):            vollständige Umsetzungs-Roadmap mit fertigen Prompts
```

Alles, was von der bestehenden Codebasis abhängt (Dateigrößen, Renderpfade, Performance-Grenzen), wird hier bewusst als **offene technische Frage** markiert und in Schritt 2 geklärt. Der Auftragstext dafür steht in Anhang A.

---

## 2. Produktleitbild

Die zentrale Produktentscheidung, aus der alles andere folgt:

> **Physische Ströme zuerst. Abhängigkeiten und Schocks sind Schlussfolgerungen, keine Startpunkte.**

Der Atlas soll zuerst eine **intuitive Anschauung** der Stoffströme erzeugen — das „Wow, da fließt ja ganz schön viel von Afrika nach China und von China nach Europa". Analytische Fragen (Wer hängt von wem ab? Was passiert bei einem Schock?) werden später als **abgeleitete Sichten** auf Materialfluss und Prozesskette angeboten, nicht als Einstieg.

Daraus folgt die Erlebnis-Treppe:

```text
Sehen      → Ströme und Mengen intuitiv erfassen (Partikel, Säulen, Zeitraffer)
Staunen    → Größenordnungen und Verschiebungen entdecken
Verstehen  → Bilanzen und Prozessketten nachvollziehen
Ableiten   → Abhängigkeiten, Konzentration, Schockexposition als Konsequenz erkennen
```

Weitere Produktentscheidungen (festgelegt am 2026-07-19):

| Entscheidung | Festlegung | Konsequenz |
|---|---|---|
| Nutzungsmodus | **Erst Denkwerkzeug**, Public-/Story-Layer später andockbar | UI darf parameterreich sein; Presets/Touren als spätere dünne Schicht über denselben Renderdaten |
| Einstiegseinheit | **Rohstoff zuerst** („Zeig mir Öl") | Commodity-Navigator ist das primäre Navigationselement; Länder-Drilldown ist sekundär (Klick auf Karte) |
| Zeitdimension | **Jahresvergleich früh, Zeitreise als Kernziel** | Zeitleiste wird durchgehendes UI-Element; Traum: einen Rohstoff über ~200 Jahre verfolgen |
| Pilot-Vertikalen | **1. Energie (Kohle/Öl/Gas), 2. Soja-Komplex** | Energie hat die längsten historischen Reihen (Kohle ab ~1800); Soja ist die Lehrbuch-Multi-Output-Kette |

---

## 3. Priorisierte Modellebenen

Bezogen auf die Layer-Nummerierung aus MVP.md:

| Prio | Modellebene | Warum in dieser Reihenfolge |
|---|---|---|
| **P1** | **Layer 2: Produktion/Quellen** für die vorhandenen Commodity-Gruppen | Macht aus dem Handelsatlas ein Materialflussmodell. Kern-Aha: Weltproduktion vs. Welthandel — wie viel Stoffwechsel ist im reinen Handelsbild unsichtbar? |
| **P1** | **Multi-Jahr im Handelslayer** (BACI, ca. 2003–2023) | Zeit ist die gewünschte Kernachse; die Datenstruktur dafür muss früh stehen, damit nicht jedes Feature später umgebaut wird |
| **P2** | **Layer 3 light: scheinbarer Inlandsverbrauch** (Produktion + Import − Export) | Fällt fast gratis aus Layer 2; komplettiert die Bilanz-Sicht. Echte Nutzungskategorien (Food Balance Sheets etc.) erst mit der Soja-Vertikale |
| **P2** | **Layer 4: Prozessketten, nur Pilot-Vertikalen** (stöchiometrisch, wenige Prozesse) | Ohne Prozessebene bleibt der Blick auf Stoffe isoliert; sie ist erklärtes Ziel. Aber streng begrenzt: Rohöl→Raffinerieprodukte, später Soja-Crushing. Kein vollständiger Prozesskatalog |
| **P3** | **Deep-Time-Datenlayer** (historische Produktion je Land) | Der 200-Jahre-Traum. Kohle ab ~1800, Öl ab ~1860 (OWID/Mitchell), Metalle ab ~1900 (USGS Historical Statistics). Bilateraler Handel historisch nur lückenhaft → ehrlich als „Datenhorizont" ausweisen |
| **P4** | **Layer 5: abgeleitete Analysen** (Importabhängigkeit, Konzentration, einfache Schocks) | Bewusst nachgelagert. Die Metriken existieren teils schon (`trade_metrics`); es fehlt nur die Sicht darauf — als Overlay über der Bilanz, nicht als eigener Einstieg |
| **P5** | **Public-/Story-Layer** (Presets, Touren, Share-Links) | Dünne Schicht über denselben Zuständen und Renderdaten; lohnt erst, wenn F1–F4 etwas zu erzählen haben |

**Explizit zurückgestellt** (unverändert zu MVP.md §18): Preise, Substitution, Lager, echte Transportrouten, MRIO-Integration, vollständige Prozessontologie.

---

## 4. Kern-UX-Konzept: „Ein Globus, drei Sichten, eine Zeitleiste"

### 4.1 Grundprinzip

Die App bleibt **eine einzige Globus-Szene**. Es gibt keine getrennten „Seiten", sondern **Sichten** (Modi) auf denselben Rohstoff im selben Jahr. Kamera, Rohstoffauswahl und Jahr bleiben beim Sichtwechsel erhalten — das erzeugt das Gefühl, *ein* Objekt (den planetaren Stoffwechsel) von verschiedenen Seiten zu betrachten, statt zwischen Dashboards zu springen.

Die drei Sichten:

```text
Sicht 1: STRÖME   (existiert)  Wer schickt was wohin?     → Partikel-Plumes
Sicht 2: BILANZ   (neu, F1)    Wo entsteht/verbleibt es?  → Säulen/Choropleth pro Land
Sicht 3: KETTE    (neu, F3)    Wie wird es umgewandelt?   → Prozessstufen-Stepper + Sankey
```

Dazu quer über alle Sichten: **die Zeitleiste** (F2, später F4) als unteres, durchgehendes UI-Element.

### 4.2 Layout-Spezifikation

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo/Titel]   [Ströme | Bilanz | Kette]          [Jahr: 2022]  [⚙] │  ← Kopfzeile
├──────────┬─────────────────────────────────────────────┬────────────┤
│          │                                             │            │
│ Commodity│                                             │ Steckbrief │
│ Navigator│              GLOBUS                         │ / Kontext- │
│          │        (Partikel, Säulen, Länder)           │   Panel    │
│ Gruppen  │                                             │            │
│  └ Roh-  │                                             │ (global    │
│    stoffe│                                             │  oder Land)│
│          │                                             │            │
├──────────┴─────────────────────────────────────────────┴────────────┤
│ [▶] ────────●──────────────────────────  2003 ─ 2023   [A/B] [1×]   │  ← Zeitleiste
└──────────────────────────────────────────────────────────────────────┘
```

**Kopfzeile:**
- Sicht-Umschalter als Segmented Control: `Ströme | Bilanz | Kette`. „Kette" ist ausgegraut mit Tooltip, solange die gewählte Commodity keine modellierte Prozesskette hat.
- Aktives Jahr als Anzeige (Interaktion über die Zeitleiste).
- Zahnrad `⚙` öffnet das **Viz-Tuning-Panel** (siehe unten).

**Links — Commodity-Navigator** (der Einstieg, gemäß „Rohstoff zuerst"):
- Baumliste `Commodity-Gruppe → Rohstoff` (Energie, Metalle, Agrar/Futter, Dünger — wie configs/commodities).
- Suchfeld oben.
- Aktive Commodity deutlich markiert; Farbe der Commodity-Gruppe (identisch zur Partikelfarbe) als Farbpunkt neben jedem Eintrag — die Legende wird damit navigierbar.
- Mehrfachauswahl innerhalb einer Gruppe bleibt möglich (wie heute für Ströme), aber Steckbrief und Bilanz beziehen sich immer auf **eine** fokussierte Commodity.
- Einklappbar (Platz für den Globus).

**Rechts — Kontext-Panel „Steckbrief":** zwei Zustände:
- **Global** (nichts auf der Karte selektiert): Steckbrief der fokussierten Commodity — siehe F1.
- **Land-Fokus** (Land angeklickt): Landesbilanz und Partnerlisten — siehe F1.
- Schließen des Land-Fokus per `×` oder Klick ins Leere → zurück zu Global.

**Unten — Zeitleiste:** Slider über verfügbare Jahre, Play/Pause, Geschwindigkeit, A/B-Vergleichsknopf — siehe F2. In F4 wird sie zur Deep-Time-Leiste mit Datenhorizont-Bändern.

**Viz-Tuning-Panel:** Die bestehenden Render-Regler (Partikelparameter, Plume-Einstellungen etc.) wandern aus der Haupt-UI in ein einklappbares Seitenpanel/Drawer hinter dem Zahnrad. Begründung: Der Werkzeugcharakter bleibt vollständig erhalten (nichts wird entfernt), aber die Standard-UI erzählt vom *Inhalt* (Rohstoff, Jahr, Sicht), nicht von der *Renderengine*. Das ist zugleich die Vorbereitung auf den späteren Public-Modus, in dem dieses Panel schlicht ausgeblendet wird.

### 4.3 Interaktionsgrundsätze

- **Hover** auf Fluss/Säule/Land: Tooltip mit Name, Menge, Einheit, Jahr, Quelle.
- **Klick** auf Land: Land-Fokus im Kontext-Panel; auf dem Globus werden die Flüsse des Landes hervorgehoben, alle anderen abgedimmt.
- **Sichtwechsel** ändert nie Kamera, Commodity oder Jahr.
- **Einheiten ehrlich:** Alle Mengen in Tonnen (v0.1-Konvention); wo Datenquellen anderes liefern (Energieeinheiten), wird die Umrechnung ausgewiesen. Abgeleitete Größen (scheinbarer Verbrauch) sind visuell als abgeleitet markiert („methodischer Eimer mit Fußnote", MVP.md §8).
- **Jede Zahl hat eine Quelle:** Tooltip/Panel nennen `source_dataset` + Jahr. Das ist Thinktank-Hygiene und kostet fast nichts, wenn es von Anfang an mitläuft.

---

## 5. Feature-Roadmap

Reihenfolge = empfohlene Bau-Reihenfolge. F1 und F2 sind teilweise parallelisierbar (F1 = Daten+Panel, F2 = Zeitachse), sollten aber auf einer gemeinsamen Zustandsarchitektur aufsetzen (Klärung in Schritt 2).

---

### F1 — Bilanz-Sicht + Commodity-Steckbrief

**Produktziel:** Der Atlas beantwortet erstmals „Wo entsteht der Stoff, und wo verbleibt er?" — und zeigt den blinden Fleck des reinen Handelsbilds.

**Modell/Daten:**
- `production_sources` (Schema existiert als Platzhalter, MVP.md §7) für die vorhandenen Commodity-Gruppen füllen, zunächst **ein Referenzjahr** (identisch zum BACI-Referenzjahr):
  - **Energie:** Kohle, Rohöl, Erdgas. Quellen-Empfehlung: *Energy Institute Statistical Review of World Energy* (frei, ehemals BP) und/oder OWID-Energiedaten; IEA World Energy Balances ist lizenzpflichtig → Entscheidung in Schritt 3, Start mit den freien Quellen.
  - **Metalle:** USGS Mineral Commodity Summaries (Eisenerz, Kupfer, Bauxit/Aluminium …).
  - **Agrar:** FAOSTAT (Weizen, Mais, Sojabohnen …).
- Scheinbarer Inlandsverbrauch je Land: `Produktion + Import − Export` (ohne Lageränderung, als solcher gekennzeichnet).
- Neue Renderdaten: pro Commodity+Jahr eine Länder-Tabelle `{country, production, import, export, apparent_use}` (Arbeitsname `render_country_balance`), getrennt vom Flow-Renderpfad (Grundsatz: neutrale Renderdaten, Engine austauschbar).

**UX/UI-Spezifikation:**
- **Bilanz-Sicht auf dem Globus:** pro Land eine Darstellung von Produktion und scheinbarem Verbrauch. Zwei Kandidaten, Entscheidung nach technischem Spike in Schritt 3:
  - *Variante Säulen:* zwei Säulen pro Land (Produktion | scheinbarer Verbrauch), Höhe wurzel- oder log-skaliert, Farben konsistent zur Commodity-Gruppe (entspricht `render_columns`-Vorbereitung aus MVP.md §11.4).
  - *Variante Choropleth:* Ländereinfärbung nach gewählter Größe mit Toggle `Produktion | Verbrauch | Netto (Prod−Verbrauch)`; Netto divergierend eingefärbt (Überschussland ↔ Bedarfsland).
  - Die Ländermap existiert bereits — die Choropleth-Variante ist vermutlich der billigere erste Schritt, die Säulen der ausdrucksstärkere zweite. Beides kann koexistieren (Toggle im Viz-Tuning).
- **Overlay-Option:** Bilanz-Sicht kann die Handelsströme gedimmt darüberlegen („Ströme einblenden", Checkbox) — dann sieht man Quelle, Senke *und* Fluss in einem Bild. Das ist das Kernbild des ganzen Projekts.
- **Steckbrief (global), Reihenfolge von oben nach unten:**
  1. Commodity-Name + Gruppe + Jahr.
  2. Kennzahlen-Kacheln: **Weltproduktion** [t], **Welthandelsmenge** [t], **Handelsquote** = Handel/Produktion in % — die eine Zahl, die den blinden Fleck des Handelsbilds beziffert.
  3. Top-5-Listen (horizontale Balken): Produzenten, Exporteure, Importeure. Klick auf ein Land = Land-Fokus.
  4. Quellenzeile (Datensatz + Version).
- **Land-Fokus-Panel:**
  1. Landesname, Jahr.
  2. Bilanzgrafik: Produktion + Import − Export = scheinbarer Verbrauch (als Wasserfall- oder Balkendarstellung).
  3. Top-Lieferanten und Top-Abnehmer (aus `trade_flows`), mit Anteil in %.
  4. Hinweiszeile, wenn scheinbarer Verbrauch negativ wird (Re-Export-/Lager-/Datenartefakt — ehrlich ausweisen statt glattbügeln).

**Akzeptanz (Produktsicht):** Für Rohöl, Kohle, Weizen, Kupfer, Sojabohnen zeigt die Bilanz-Sicht plausible Produktions- und Verbrauchsbilder; die Handelsquote pro Commodity ist im Steckbrief sichtbar; Klick auf China/Deutschland/Brasilien liefert eine konsistente Landesbilanz.

---

### F2 — Zeitachse v1 (BACI-Mehrjahr)

**Produktziel:** Verschiebungen sichtbar machen — Chinas Aufstieg, Sanktionseffekte, Sojaboom. „Jahresvergleich früh."

**Modell/Daten:**
- BACI-Import für ca. 2003–2023 (verfügbare HS-Revision je Zeitraum beachten — Mapping über `commodity_code_map` existiert konzeptionell).
- Pipeline erzeugt Renderdaten **pro Jahr**; das Frontend lädt Jahre lazy (Format-/Größenfrage → Schritt 2: heutige `flowmap.json` ist ~1,5 MB für ein Jahr; 20 Jahre × alle Commodities braucht ein Ladekonzept).
- `render_country_balance` (aus F1) ebenfalls je Jahr, soweit Produktionsquellen es hergeben.

**UX/UI-Spezifikation:**
- **Zeitleiste unten, immer sichtbar:**
  - Slider mit Jahres-Ticks; Ziehen wechselt das Jahr in der aktiven Sicht (Partikel-Neuemission bzw. Säulen/Choropleth-Update).
  - **Play/Pause** + Geschwindigkeit (z. B. 1 Jahr pro 2 s / 1 s / 0,5 s): der erste kleine „Zeitraffer".
  - Beim Abspielen weiche Übergänge (Interpolation der Säulenhöhen/Farbwerte; Partikelströme wechseln pro Jahr — keine Vortäuschung unterjähriger Daten).
- **A/B-Vergleichsmodus** (Knopf `A/B` in der Zeitleiste):
  - Zwei Jahres-Marker auf dem Slider (A und B).
  - Empfohlene Darstellungsform: **Differenz-Modus** — der Globus zeigt B−A (Choropleth divergierend; Flüsse: dicker = gewachsen, dünner/gegenfarbig = geschrumpft). Split-Screen mit zwei Globen ist verlockend, aber teuer und kameratechnisch nervig; Differenz auf einem Globus ist analytisch stärker. Split kann später als Public-Feature kommen.
  - Steckbrief zeigt im A/B-Modus beide Jahreswerte + Delta in %.
- **Sparklines im Steckbrief:** Sobald Mehrjahresdaten da sind, bekommen die Kennzahlen-Kacheln (Weltproduktion, Handel, Handelsquote) und die Top-5-Listen Mini-Zeitreihen. Das macht das Panel vom Jahres-Snapshot zum Zeitfenster.

**Akzeptanz:** Jahr wechseln in < 1 s wahrgenommener Latenz (nach erstem Laden); Play-Modus läuft flüssig über 20 Jahre; A/B 2013 vs. 2023 für Sojabohnen zeigt den China-Effekt auf einen Blick.

---

### F3 — Ketten-Sicht (Pilot: Energie, dann Soja)

**Produktziel:** „Wie wird der Stoff umgewandelt?" — die Prozessebene als drittes Standbein, streng auf Pilot-Vertikalen begrenzt.

**Modell/Daten:**
- `processes` + `process_flows` einführen (stöchiometrisches Long-Table-Modell exakt nach MVP.md §9: Inputs negativ, Outputs positiv, `flow_role`, Referenznormierung).
- **Pilot Energie:**
  - Prozess `Rohölraffination`: Rohöl → Diesel + Benzin + Kerosin + Naphtha + Schweröl + Raffineriegas (weltdurchschnittlicher Produktmix als Startkoeffizienten, Quelle dokumentieren).
  - Kohle und Erdgas zunächst als „Durchlauf-Stufen" (Förderung → Handel → energetische Nutzung) ohne komplexe Prozessmatrix — die Kette darf unterschiedlich tief sein.
- **Danach Soja:** `Sojabohnen-Crushing` (−1,00 Bohnen → +0,78 Schrot +0,18 Öl +0,04 Verluste) — der Multi-Output-Lehrbuchfall, der beweist, dass das Modell Co-Produkte nicht unterschlägt.
- Verknüpfung: Jede Prozessstufe referenziert Commodities, die bereits Handels- und (soweit vorhanden) Produktionsdaten haben. Die Kette verbindet also existierende Layer, statt eine Parallelwelt aufzubauen.

**UX/UI-Spezifikation:**
- **Stufen-Stepper** oben im Globusbereich (nur in der Ketten-Sicht), z. B. für Öl:

  ```text
  [Rohöl-Förderung] → [Rohöl-Handel] → [Raffination] → [Produkt-Handel] → [Verbrauch]
  ```

  - Klick auf eine Stufe: Der Globus zeigt die zu dieser Stufe gehörige Darstellung — Handelstufen als Ströme, Förder-/Verbrauchsstufen als Bilanz-Darstellung, Prozessstufen (Raffination) als Länder-Marker skaliert nach Raffineriekapazität/-durchsatz (sofern Daten; sonst entfällt die Geo-Darstellung dieser Stufe zunächst).
  - Pfeile zwischen den Stufen tragen die Weltsummen in t.
- **Sankey-Panel:** Das Kontext-Panel zeigt in der Ketten-Sicht ein Sankey-Diagramm der Umwandlung (Weltsummen): Inputs links, Outputs inkl. Co-Produkte/Verluste rechts. Bei Land-Fokus: dasselbe für das Land, soweit Daten vorhanden, sonst Welt mit Hinweis.
- **Grundsatz im UI verankert:** Co-Produkte werden immer mitgezeigt. Wer die Sojaöl-Stufe ansieht, sieht den Schrot daneben. Keine Tabellenzauberei mit Betrugsabsicht.
- Commodities mit modellierter Kette bekommen im Navigator ein kleines Ketten-Icon; für alle anderen bleibt die Sicht ausgegraut (mit Tooltip „Prozesskette noch nicht modelliert").

**Akzeptanz:** Für Öl lässt sich durch die Stufen klicken und die Welt-Raffinationsbilanz stimmt größenordnungsmäßig mit bekannten Zahlen überein; für Soja zeigt das Sankey Crushing mit allen Co-Produkten; Stufenwechsel fühlt sich an wie „dieselbe Welt, nächster Verarbeitungsschritt", nicht wie ein Seitenwechsel.

---

### F4 — Deep-Time-Zeitreise

**Produktziel:** Der 200-Jahre-Traum: einen Rohstoff (zuerst Kohle/Öl) über Jahrhunderte verfolgen und die Industrialisierung als Stoffstrom sehen.

**Modell/Daten:**
- Historischer Produktionslayer, **nur Produktion je Land und Jahr** (bilateraler Handel existiert historisch nicht flächendeckend):
  - Kohle: ab ~1800 (OWID auf Basis Mitchell u. a.).
  - Rohöl: ab ~1860.
  - Später Metalle: USGS Historical Statistics ab ~1900 (Kupfer, Eisen …).
- Länder-Historie ist das methodische Hauptproblem (Grenzänderungen, Sowjetunion, Kolonien). Pragmatik v1: heutige Ländergrenzen + explizite Sonderfälle (`valid_from`/`valid_to` in `countries` existiert dafür schon); Unschärfe dokumentieren statt verstecken.

**UX/UI-Spezifikation:**
- **Zeitleiste wird zur Deep-Time-Leiste:** logarithmische oder zweistufige Skala (z. B. Übersichtsband 1800–heute + Zoombereich), darüber **Datenhorizont-Bänder** pro Layer:

  ```text
  Produktion  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  1800 ────────────── 2023
  Handel      ·············▓▓▓▓▓▓▓▓         (BACI ab ~1995)
  Prozesse    ··················▓▓▓         (Referenzjahre)
  ```

  Fährt man vor den Handels-Horizont zurück, blenden die Partikelströme sichtbar aus und ein dezenter Hinweis erscheint („vor 1995 keine bilateralen Handelsdaten — Anzeige: Produktion"). Ehrlichkeit als Feature.
- **Zeitraffer-Modus:** Play über die Jahrhunderte; Produktions-Säulen/Choropleth wachsen; Jahreszahl groß eingeblendet; optional Ereignis-Marker (frei konfigurierbare Annotationen: „1859 Drake Well", „1973 Ölkrise") als dezente Punkte auf der Leiste mit Tooltip.
- Deep-Time ist zunächst nur für die Energie-Commodities aktiv; der Navigator zeigt pro Commodity die zeitliche Reichweite (z. B. „ab 1800").

**Akzeptanz:** Kohle im Zeitraffer 1800–2023 erzählt sichtbar die Geschichte Großbritannien → USA/Deutschland → China; die Datenhorizont-Bänder machen jederzeit klar, was gezeigt wird und was fehlt.

---

### F5 — Abgeleitete Analysen (Abhängigkeit & Schock-Sandbox)

**Produktziel:** Die nachgelagerten Fragen — jetzt als Schlussfolgerung aus dem Materialfluss, genau wie im Leitbild vorgesehen.

**Modell/Daten:**
- Metriken existieren größtenteils (`trade_metrics`: Importanteile, Lieferantenzahl, Herfindahl-Hirschman-Index) — sie brauchen v. a. eine Sicht.
- Einfache Schockrechnung nach MVP.md §10: Exportreduktion Land/Region → direkte Importlücke je Land (`shock_results_direct`). Keine Zweitrundeneffekte, keine Substitution — außer: liegt eine Prozesskette (F3) vor, wird die Lücke eine Stufe weitergereicht („20 % weniger Rohöl → rechnerisch X t weniger Raffinerieprodukte") als grobe, klar markierte Abschätzung.

**UX/UI-Spezifikation:**
- **Abhängigkeits-Overlay** (Toggle in der Bilanz-Sicht, kein eigener Modus): Choropleth „Importabhängigkeit" (Netto-Import / scheinbarer Verbrauch) oder „Lieferantenkonzentration" (HHI). Steckbrief zeigt die zugehörigen Kennzahlen.
- **Schock-Sandbox** (Panel, aufrufbar aus dem Land-Fokus oder Steckbrief):
  1. Wähle Exporteur (oder Region) + Commodity + Ausfall-% (Slider).
  2. Globus färbt betroffene Importeure nach relativer Importlücke; die ausfallenden Ströme werden rot/gestrichelt dargestellt.
  3. Ergebnisliste: Top-betroffene Länder mit absoluter und relativer Lücke.
  4. Deutliche Kennzeichnung: „direkte Erstrundeneffekte, keine Umlenkung/Substitution".

**Akzeptanz:** „Was, wenn Land X seine Sojaexporte halbiert?" ist in unter 30 Sekunden vom Gedanken zum Bild beantwortbar.

---

### F6 — Story-/Public-Layer

**Produktziel:** Aus dem Werkzeug wird ein herzeigbares Thinktank-Stück — als dünne Schicht, ohne das Werkzeug zu verwässern.

**UX/UI-Spezifikation (bewusst knapp, Detail folgt später):**
- **Presets:** benannter App-Zustand (Commodity, Sicht, Jahr/Zeitraum, Kamera, Overlays, ggf. Schockszenario) als JSON, speicher- und ladbar.
- **Share-Links:** derselbe Zustand URL-kodiert.
- **Touren:** Sequenz von Presets mit Erzähltext, „Weiter"-Navigation, sanften Kameraflügen (z. B. „Tour: Das Ölzeitalter in 8 Stationen").
- **Public-Modus:** Viz-Tuning und Analyse-Panels ausgeblendet, Touren + freie Exploration mit reduzierter UI.

---

## 6. Offene technische Fragen (Input für Schritt 2)

Diese Punkte entscheiden über Zuschnitt und Reihenfolge der Arbeitspakete in Schritt 3:

1. Struktur der `web/src/main.tsx` (~1700 Zeilen): Wie sind Szene, Layer, UI und Zustand heute verwoben? Wo sind natürliche Schnittstellen für Sichten, Zeitachse, Panels?
2. Renderdatenpfad: Format/Größe von `flowmap.json`, Ladekonzept für „pro Jahr × pro Commodity"-Daten; Grenze der Partikelzahl.
3. Zustandsarchitektur: Gibt es einen zentralen App-State (Commodity, Jahr, Sicht, Selektion), oder muss er geschaffen werden? (F1–F6 hängen alle daran; Presets/URL-Encoding in F6 sowieso.)
4. Pipeline (`pipeline.py`, `build_v01.py`): Erweiterbarkeit auf Mehrjahr, neue Quellen-Loader, `production_sources`, Prozesstabellen; Testabdeckung.
5. Ländermap/Geometrien: Eignung für Choropleth + Klick-Selektion; Performance.
6. Konfigurationssystem (`configs/`): Wo werden Commodities/Quellen/Sichten deklariert?

Der vollständige Auftragstext für die Bestandsaufnahme steht in Anhang A.

---

## 7. Leitplanken (unverändert gültig)

- Kernmodell → neutrale Renderdaten → austauschbare Visualisierung (MVP.md §11–12).
- Rohdaten nie verstümmeln; jede Zahl trägt Quelle und Version.
- Abgeleitete Größen als abgeleitet markieren.
- Co-Produkte nie unterschlagen.
- Ein Rohstoff. Ein Jahr. Eine Datenquelle. Ein Graph. Dann wächst der Drache.

---

## Anhang A: Auftragstext für die technische Bestandsaufnahme (Schritt 2)

Den folgenden Text als Auftrag an das Analyse-Modell geben (Lesezugriff aufs Repo genügt; keine Code-Änderungen):

```text
Erstelle eine technische Bestandsaufnahme dieses Repositories (physischer
Weltwirtschafts-Atlas, Stand nach v0.1 + Globus/Ländermap-Iterationen) als
Markdown-Dokument docs/tech_inventory.md. Nur lesen und dokumentieren, nichts
ändern. Kontext: Auf Basis dieser Bestandsaufnahme wird eine Umsetzungs-Roadmap
für docs/feature_roadmap.md erstellt — beantworte insbesondere die dort in
Abschnitt 6 gelisteten offenen Fragen.

1. FRONTEND (web/):
   - Struktur von web/src/main.tsx: Zerlege die Datei in ihre logischen
     Verantwortlichkeiten (Szenenaufbau, Layer, Partikelsystem, UI-Controls,
     Datenladen, State). Welche Abschnitte (Zeilenbereiche) machen was?
   - Wie wird State verwaltet (Commodity-Auswahl, Renderparameter, Kamera)?
     Gibt es einen zentralen Zustand oder verstreute Variablen?
   - Wie ist die Ländermap implementiert (Datenquelle, Geometrieformat,
     Hit-Testing)? Ist Klick-Selektion von Ländern und Choropleth-Einfärbung
     damit machbar?
   - Renderpfad der Partikel: Wie werden Flüsse in Partikel übersetzt, wo
     liegen Performance-Grenzen (Partikelzahl, Draw Calls)?
   - Abhängigkeiten (package.json): welche Bibliotheken, welche Versionen?
2. DATEN & RENDERFORMAT:
   - Exaktes Schema und Größe von web/public/render/flowmap.json und
     data/render/*. Wie viele Flüsse/Commodities/Jahre stecken darin?
   - Wie skaliert das Format auf ~20 Jahre × alle Commodities? Empfehlung für
     ein Ladekonzept (pro Jahr lazy, pro Commodity, Vorformat Parquet→JSON?).
3. PIPELINE (src/physical_economy/, scripts/build_v01.py):
   - Ablauf der Pipeline Schritt für Schritt; welche Tabellen aus MVP.md sind
     real implementiert, welche nur Platzhalter?
   - Wie aufwendig sind: Mehrjahres-BACI-Import, ein neuer Quellen-Loader
     (z. B. USGS/FAOSTAT/Energy-Institute-CSV), Befüllung von
     production_sources, Einführung von processes/process_flows?
   - Zustand der Tests (tests/) und der Konfiguration (configs/).
4. BEWERTUNG:
   - Die 5 größten technischen Risiken/Engpässe für die Features F1–F6 aus
     docs/feature_roadmap.md.
   - Empfehlung: Was sollte refaktoriert werden, BEVOR neue Features gebaut
     werden (z. B. main.tsx-Zerlegung, zentraler App-State), und was kann
     warten?
Format: nüchtern, konkret, mit Dateipfaden und Zeilenangaben. Keine
Umsetzungsvorschläge für die Features selbst — nur Ist-Zustand + Risiken +
Refactoring-Empfehlung.
```
