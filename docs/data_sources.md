# Data Sources and Assumptions

## Primary Source Path

Version 0.1 is designed for CEPII BACI trade data:

- Source: Centre d'Etudes Prospectives et d'Informations Internationales, Base pour l'Analyse du Commerce International
- Website: https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html
- Intended raw table: `raw_trade_baci`

The checked-in prototype uses `data/raw/baci/baci_2022_seed.csv`, a BACI-shaped seed table, so the pipeline and visualization can run before large source files are downloaded.

## Seed Dataset

The seed file is not an observed statistical dataset. It is a small, documented engineering fixture with plausible-looking magnitudes for testing:

- country mapping
- HS-code to commodity mapping
- gross flow generation
- net flow generation
- top-flow and supplier concentration metrics
- flowmap.gl render data

Do not use the seed data for factual analysis.

## Units

Version 0.1 stores physical mass as metric tonnes:

- `unit_id`: `tonne`
- `conversion_to_base_unit`: `1.0`

Trade values are stored as thousands of current US dollars, matching the BACI-style field used in this prototype.

## Commodity Mapping

The initial `commodity_code_map` covers more than the minimum three product groups:

- hard coal
- crude oil
- wheat
- soybeans
- iron ore
- copper ore
- phosphate rock

Mappings are intentionally coarse and carry `mapping_confidence`. Real BACI ingestion should preserve source HS versions and mapping notes.

## Visualization Boundary

The web app reads `web/public/render/flowmap.json`. It does not read raw trade data, does not compute net flows and does not encode commodity mappings. This keeps the visualization replaceable.
