# Global Commodity Trade Atlas v0.1

Trade-only prototype for a physical world-economy model. Version 0.1 builds a small but complete data path:

```text
reference data + BACI-shaped raw trade rows
  -> trade_flows
  -> net_trade_flows
  -> trade_metrics
  -> neutral render_flows
  -> flowmap.gl web map
```

The repository ships with a documented seed dataset so the prototype runs without downloading CEPII BACI first. Real BACI CSVs can be added later under `data/raw/baci/` with the same columns as `baci_2022_seed.csv`.

## Build the v0.1 Data Layer

```bash
python3 scripts/build_v01.py
```

Outputs are written to:

- `data/processed/`
- `data/render/`
- `web/public/render/flowmap.json`

## Run the Map

```bash
cd web
npm install
npm run dev
```

The dev server is pinned to `http://localhost:5173/` with `strictPort: true`. If Vite says the port is already in use, an old dev server is still running. Stop that process or run a different explicit port:

```bash
npm run dev -- --port 5174
```

The browser app uses `flowmap.gl` through `@flowmap.gl/layers` and only reads neutral render JSON. It does not know how `trade_flows` or `net_trade_flows` are computed.

## Version 0.1 Scope

Included:

- reference tables for countries, units, commodities and HS mappings
- BACI-shaped raw input table
- normalized gross trade flows
- pairwise net trade flows
- import/export metrics and supplier concentration
- placeholder tables for sources, uses and transformations
- flowmap.gl visualization fed by neutral render data

Not included yet:

- real production, domestic use or transformation coefficients
- transport routes, ports, travel times or inventory
- price effects, substitution or downstream process shocks
