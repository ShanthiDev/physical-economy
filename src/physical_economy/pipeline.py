from __future__ import annotations

import csv
import io
import json
import math
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .paths import CONFIG_DIR, PROCESSED_DIR, REFERENCE_DIR, RENDER_DIR, WEB_RENDER_DIR


PLACEHOLDER_TABLES: dict[str, list[str]] = {
    "production_sources": [
        "source_id",
        "year",
        "country_id",
        "commodity_id",
        "quantity",
        "unit_id",
        "source_type",
        "source_dataset",
        "source_version",
        "spatial_precision",
        "notes",
    ],
    "domestic_uses": [
        "use_id",
        "year",
        "country_id",
        "commodity_id",
        "use_category",
        "quantity",
        "unit_id",
        "source_dataset",
        "source_version",
        "is_observed",
        "is_inferred",
        "method_notes",
    ],
    "processes": [
        "process_id",
        "process_name",
        "process_group",
        "technology_variant",
        "region",
        "reference_commodity_id",
        "reference_quantity",
        "reference_unit_id",
        "valid_from",
        "valid_to",
        "source_dataset",
        "source_version",
        "notes",
    ],
    "process_flows": [
        "process_flow_id",
        "process_id",
        "commodity_id",
        "flow_role",
        "coefficient",
        "unit_id",
        "is_required_input",
        "is_coproduct",
        "is_residual",
        "uncertainty_level",
        "source_dataset",
        "source_version",
        "notes",
    ],
    "render_particles": [
        "particle_id",
        "render_time_start",
        "render_time_duration",
        "origin_country_id",
        "destination_country_id",
        "origin_longitude",
        "origin_latitude",
        "destination_longitude",
        "destination_latitude",
        "commodity_id",
        "commodity_group",
        "quantity_represented",
        "unit_id",
        "color_rgba",
        "radius",
        "jitter_seed",
        "path_variant",
        "source_flow_id",
    ],
    "render_columns": [
        "column_id",
        "year",
        "country_id",
        "commodity_id",
        "column_type",
        "quantity",
        "unit_id",
        "scaled_height",
        "base_longitude",
        "base_latitude",
        "render_longitude",
        "render_latitude",
        "grid_x",
        "grid_y",
        "color_rgba",
        "source_table",
        "source_id",
    ],
}


@dataclass(frozen=True)
class BuildSummary:
    target_year: int
    raw_rows: int
    trade_flows: int
    net_trade_flows: int
    render_flows: int
    commodities: int
    countries: int


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: Iterable[dict[str, object]], fieldnames: list[str]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fieldnames})
            count += 1
    return count


def load_config() -> tuple[dict[str, object], dict[str, object]]:
    with (CONFIG_DIR / "datasets.json").open(encoding="utf-8") as handle:
        datasets = json.load(handle)
    with (CONFIG_DIR / "visualisation.json").open(encoding="utf-8") as handle:
        visualisation = json.load(handle)
    return datasets, visualisation


def get_included_code_map() -> dict[str, dict[str, str]]:
    return {
        row["code"].zfill(6): row
        for row in read_csv(REFERENCE_DIR / "commodity_code_map.csv")
        if row["include_flag"].lower() == "true"
    }


def parse_float(value: str) -> float:
    if value == "":
        return 0.0
    return float(value)


def format_number(value: float) -> str:
    if math.isclose(value, round(value)):
        return str(int(round(value)))
    return f"{value:.6f}".rstrip("0").rstrip(".")


def repair_mojibake(value: str) -> str:
    try:
        return value.encode("latin1").decode("utf-8")
    except UnicodeError:
        return value


def rgba_to_deck_color(value: str) -> list[int]:
    body = value.strip().removeprefix("rgba(").removesuffix(")")
    parts = [part.strip() for part in body.split(",")]
    red, green, blue = (int(float(parts[index])) for index in range(3))
    alpha = int(float(parts[3]) * 255) if len(parts) > 3 else 255
    return [red, green, blue, alpha]


def copy_reference_tables() -> None:
    for table_name in ["countries", "commodities", "commodity_code_map", "units"]:
        rows = read_csv(REFERENCE_DIR / f"{table_name}.csv")
        if not rows:
            continue
        write_csv(PROCESSED_DIR / f"{table_name}.csv", rows, list(rows[0].keys()))


def read_baci_metadata(zip_path: Path) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    with zipfile.ZipFile(zip_path) as archive:
        country_file = next(name for name in archive.namelist() if name.startswith("country_codes_"))
        product_file = next(name for name in archive.namelist() if name.startswith("product_codes_HS22_"))

        with archive.open(country_file) as handle:
            countries = {
                row["country_code"]: row
                for row in csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8-sig"))
            }
        with archive.open(product_file) as handle:
            products = {
                row["code"].zfill(6): row["description"]
                for row in csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8-sig"))
            }
    return countries, products


def load_centroids() -> dict[str, dict[str, str]]:
    centroid_path = REFERENCE_DIR / "country_centroids.csv"
    if not centroid_path.exists():
        return {}
    return {
        row["ISO"]: row
        for row in read_csv(centroid_path)
        if row.get("ISO") and row.get("latitude") and row.get("longitude")
    }


def build_countries_from_baci(zip_path: Path) -> list[dict[str, object]]:
    baci_countries, _ = read_baci_metadata(zip_path)
    centroids = load_centroids()
    rows: list[dict[str, object]] = []
    for country in baci_countries.values():
        iso3 = country["country_iso3"]
        iso2 = country["country_iso2"]
        if not iso3 or iso3 == "NA" or not iso2:
            continue
        centroid = centroids.get(iso2)
        if not centroid:
            continue
        country_name = repair_mojibake(centroid.get("COUNTRY") or country["country_name"])
        rows.append(
            {
                "country_id": iso3,
                "iso3_code": iso3,
                "country_name": country_name,
                "region": "",
                "subregion": "",
                "latitude": centroid["latitude"],
                "longitude": centroid["longitude"],
                "valid_from": "1970",
                "valid_to": "",
                "notes": f"BACI country_code={country['country_code']}; centroid source=world-countries-centroids",
            }
        )
    rows.sort(key=lambda row: str(row["country_id"]))
    return rows


def load_raw_trade_rows(datasets: dict[str, object]) -> list[dict[str, str]]:
    raw_path = Path(str(datasets["raw_trade_path"]))
    if raw_path.suffix.lower() != ".zip":
        return read_csv(raw_path)

    target_year = int(datasets["target_year"])
    source_dataset = str(datasets.get("source_dataset", "CEPII BACI"))
    source_version = str(datasets.get("source_version", "unknown"))
    code_map = get_included_code_map()
    countries, _ = read_baci_metadata(raw_path)

    rows: list[dict[str, str]] = []
    with zipfile.ZipFile(raw_path) as archive:
        trade_file = next(name for name in archive.namelist() if f"_Y{target_year}_" in name and name.endswith(".csv"))
        with archive.open(trade_file) as handle:
            reader = csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8-sig"))
            for row in reader:
                hs_code = row["k"].zfill(6)
                if hs_code not in code_map:
                    continue
                exporter = countries.get(row["i"])
                importer = countries.get(row["j"])
                if not exporter or not importer:
                    continue
                exporter_iso3 = exporter["country_iso3"]
                importer_iso3 = importer["country_iso3"]
                if not exporter_iso3 or not importer_iso3 or exporter_iso3 == "NA" or importer_iso3 == "NA":
                    continue
                rows.append(
                    {
                        "year": row["t"],
                        "exporter_code": exporter_iso3,
                        "importer_code": importer_iso3,
                        "hs_code": hs_code,
                        "trade_value_usd_thousand": row["v"],
                        "quantity_tonnes": row["q"],
                        "source_dataset": source_dataset,
                        "source_version": source_version,
                    }
                )
    return rows


def build_trade_flows(raw_rows: list[dict[str, str]], target_year: int) -> list[dict[str, object]]:
    countries = {row["country_id"]: row for row in read_csv(REFERENCE_DIR / "countries.csv")}
    mappings = get_included_code_map()

    trade_flows: list[dict[str, object]] = []
    sequence = 1
    for raw in raw_rows:
        if int(raw["year"]) != target_year:
            continue
        mapping = mappings.get(raw["hs_code"])
        exporter = countries.get(raw["exporter_code"])
        importer = countries.get(raw["importer_code"])
        if not mapping or not exporter or not importer:
            continue
        flow_id = (
            f"tf_{raw['year']}_{mapping['commodity_id']}_"
            f"{raw['exporter_code']}_{raw['importer_code']}_{sequence:05d}"
        )
        trade_flows.append(
            {
                "flow_id": flow_id,
                "year": raw["year"],
                "exporter_country_id": exporter["country_id"],
                "importer_country_id": importer["country_id"],
                "commodity_id": mapping["commodity_id"],
                "classification_system": mapping["classification_system"],
                "classification_version": mapping["classification_version"],
                "classification_code": mapping["code"],
                "quantity_tonnes": format_number(parse_float(raw["quantity_tonnes"])),
                "trade_value_usd_thousand": format_number(parse_float(raw["trade_value_usd_thousand"])),
                "source_dataset": raw["source_dataset"],
                "source_version": raw["source_version"],
                "mapping_confidence": mapping["mapping_confidence"],
                "notes": "Generated from BACI-compatible raw row",
            }
        )
        sequence += 1
    return trade_flows


def build_net_trade_flows(trade_flows: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str, str, str], list[dict[str, object]]] = defaultdict(list)
    for flow in trade_flows:
        exporter = str(flow["exporter_country_id"])
        importer = str(flow["importer_country_id"])
        country_a, country_b = sorted([exporter, importer])
        grouped[(str(flow["year"]), str(flow["commodity_id"]), country_a, country_b)].append(flow)

    net_rows: list[dict[str, object]] = []
    for index, ((year, commodity_id, country_a, country_b), flows) in enumerate(sorted(grouped.items()), start=1):
        gross_a_to_b = sum(
            parse_float(str(flow["quantity_tonnes"]))
            for flow in flows
            if flow["exporter_country_id"] == country_a and flow["importer_country_id"] == country_b
        )
        gross_b_to_a = sum(
            parse_float(str(flow["quantity_tonnes"]))
            for flow in flows
            if flow["exporter_country_id"] == country_b and flow["importer_country_id"] == country_a
        )
        net_quantity = gross_a_to_b - gross_b_to_a
        if net_quantity >= 0:
            origin, destination, direction = country_a, country_b, "a_to_b"
        else:
            origin, destination, direction = country_b, country_a, "b_to_a"
        net_rows.append(
            {
                "net_flow_id": f"nf_{year}_{commodity_id}_{country_a}_{country_b}_{index:05d}",
                "year": year,
                "country_a_id": country_a,
                "country_b_id": country_b,
                "origin_country_id": origin,
                "destination_country_id": destination,
                "commodity_id": commodity_id,
                "gross_a_to_b_tonnes": format_number(gross_a_to_b),
                "gross_b_to_a_tonnes": format_number(gross_b_to_a),
                "net_quantity_tonnes": format_number(abs(net_quantity)),
                "net_direction": direction if not math.isclose(net_quantity, 0.0) else "balanced",
                "source_trade_flow_ids": ";".join(str(flow["flow_id"]) for flow in flows),
            }
        )
    return [row for row in net_rows if parse_float(str(row["net_quantity_tonnes"])) > 0]


def build_trade_metrics(trade_flows: list[dict[str, object]]) -> list[dict[str, object]]:
    totals: dict[tuple[str, str, str], dict[str, object]] = {}
    for flow in trade_flows:
        year = str(flow["year"])
        commodity_id = str(flow["commodity_id"])
        exporter_id = str(flow["exporter_country_id"])
        importer_id = str(flow["importer_country_id"])
        quantity = parse_float(str(flow["quantity_tonnes"]))

        export_key = (year, commodity_id, exporter_id)
        import_key = (year, commodity_id, importer_id)
        totals.setdefault(export_key, {"imports": 0.0, "exports": 0.0, "suppliers": defaultdict(float)})
        totals.setdefault(import_key, {"imports": 0.0, "exports": 0.0, "suppliers": defaultdict(float)})
        totals[export_key]["exports"] = float(totals[export_key]["exports"]) + quantity
        totals[import_key]["imports"] = float(totals[import_key]["imports"]) + quantity
        suppliers = totals[import_key]["suppliers"]
        assert isinstance(suppliers, defaultdict)
        suppliers[exporter_id] += quantity

    rows: list[dict[str, object]] = []
    for year, commodity_id, country_id in sorted(totals):
        metrics = totals[(year, commodity_id, country_id)]
        total_import = float(metrics["imports"])
        total_export = float(metrics["exports"])
        by_supplier = metrics["suppliers"]
        assert isinstance(by_supplier, defaultdict)
        supplier_shares = [amount / total_import for amount in by_supplier.values()] if total_import else []
        largest_supplier_share = max(supplier_shares) if supplier_shares else 0.0
        hhi = sum(share * share for share in supplier_shares)
        rows.append(
            {
                "year": year,
                "country_id": country_id,
                "commodity_id": commodity_id,
                "total_import_tonnes": format_number(total_import),
                "total_export_tonnes": format_number(total_export),
                "net_import_tonnes": format_number(max(total_import - total_export, 0.0)),
                "net_export_tonnes": format_number(max(total_export - total_import, 0.0)),
                "number_of_suppliers": len(by_supplier),
                "largest_supplier_share": f"{largest_supplier_share:.6f}",
                "herfindahl_hirschman_index": f"{hhi:.6f}",
                "notes": "HHI is calculated over direct import suppliers only",
            }
        )
    return rows


def build_render_flows(
    net_trade_flows: list[dict[str, object]], visualisation: dict[str, object]
) -> list[dict[str, object]]:
    countries = {row["country_id"]: row for row in read_csv(REFERENCE_DIR / "countries.csv")}
    commodities = {row["commodity_id"]: row for row in read_csv(REFERENCE_DIR / "commodities.csv")}
    colors = dict(visualisation["commodity_colors"])
    max_per_commodity: dict[str, float] = defaultdict(float)
    for row in net_trade_flows:
        commodity_id = str(row["commodity_id"])
        max_per_commodity[commodity_id] = max(
            max_per_commodity[commodity_id],
            parse_float(str(row["net_quantity_tonnes"])),
        )
    min_width = float(visualisation.get("min_render_line_width", 1.4))
    max_width = float(visualisation.get("max_render_line_width", 11.0))

    render_rows: list[dict[str, object]] = []
    for row in net_trade_flows:
        origin = countries[str(row["origin_country_id"])]
        destination = countries[str(row["destination_country_id"])]
        commodity = commodities[str(row["commodity_id"])]
        quantity = parse_float(str(row["net_quantity_tonnes"]))
        commodity_max = max_per_commodity[str(row["commodity_id"])] or quantity
        normalized = math.sqrt(quantity / commodity_max) if commodity_max else 0.0
        width = min_width + (max_width - min_width) * normalized
        visual_magnitude = max(1.0, normalized * 1_000_000_000)
        color = colors.get(str(row["commodity_id"]), "rgba(90, 90, 90, 0.75)")
        if row["origin_country_id"] == row["country_a_id"]:
            gross_origin_to_destination = row["gross_a_to_b_tonnes"]
            gross_destination_to_origin = row["gross_b_to_a_tonnes"]
        else:
            gross_origin_to_destination = row["gross_b_to_a_tonnes"]
            gross_destination_to_origin = row["gross_a_to_b_tonnes"]
        tooltip = (
            f"{commodity['commodity_name']}: {origin['country_name']} -> {destination['country_name']} | "
            f"{format_number(quantity)} tonnes net | "
            f"gross {origin['country_id']}->{destination['country_id']}: {gross_origin_to_destination} t, "
            f"reverse: {gross_destination_to_origin} t"
        )
        render_rows.append(
            {
                "render_flow_id": f"rf_{row['net_flow_id']}",
                "year": row["year"],
                "origin_country_id": origin["country_id"],
                "destination_country_id": destination["country_id"],
                "origin_longitude": origin["longitude"],
                "origin_latitude": origin["latitude"],
                "destination_longitude": destination["longitude"],
                "destination_latitude": destination["latitude"],
                "commodity_id": row["commodity_id"],
                "commodity_group": commodity["commodity_group"],
                "quantity_tonnes": row["net_quantity_tonnes"],
                "visual_magnitude": f"{visual_magnitude:.3f}",
                "commodity_max_quantity_tonnes": format_number(commodity_max),
                "unit_id": visualisation.get("unit_id", "tonne"),
                "flow_mode": visualisation.get("default_flow_mode", "net"),
                "color_rgba": color,
                "line_width": f"{width:.3f}",
                "source_table": "net_trade_flows",
                "source_id": row["net_flow_id"],
                "tooltip": tooltip,
            }
        )
    return render_rows


def limit_render_flows(render_flows: list[dict[str, object]], visualisation: dict[str, object]) -> list[dict[str, object]]:
    limit = int(visualisation.get("max_render_flows_per_commodity", 0) or 0)
    if limit <= 0:
        return render_flows
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in render_flows:
        grouped[str(row["commodity_id"])].append(row)
    limited: list[dict[str, object]] = []
    for rows in grouped.values():
        limited.extend(
            sorted(rows, key=lambda row: parse_float(str(row["quantity_tonnes"])), reverse=True)[:limit]
        )
    return sorted(limited, key=lambda row: (str(row["commodity_id"]), -parse_float(str(row["quantity_tonnes"]))))


def build_flowmap_json(render_flows: list[dict[str, object]], summary: BuildSummary) -> dict[str, object]:
    countries = {row["country_id"]: row for row in read_csv(REFERENCE_DIR / "countries.csv")}
    commodities = {row["commodity_id"]: row for row in read_csv(REFERENCE_DIR / "commodities.csv")}

    location_ids = sorted(
        {
            str(row["origin_country_id"])
            for row in render_flows
        }
        | {str(row["destination_country_id"]) for row in render_flows}
    )
    locations = [
        {
            "id": country_id,
            "name": countries[country_id]["country_name"],
            "lat": parse_float(countries[country_id]["latitude"]),
            "lon": parse_float(countries[country_id]["longitude"]),
            "region": countries[country_id]["region"],
        }
        for country_id in location_ids
    ]
    flows = [
        {
            "id": row["render_flow_id"],
            "origin": row["origin_country_id"],
            "dest": row["destination_country_id"],
            "count": parse_float(str(row["quantity_tonnes"])),
            "visualMagnitude": parse_float(str(row["visual_magnitude"])),
            "lineWidth": parse_float(str(row["line_width"])),
            "commodityMax": parse_float(str(row["commodity_max_quantity_tonnes"])),
            "commodityId": row["commodity_id"],
            "commodityGroup": row["commodity_group"],
            "color": rgba_to_deck_color(str(row["color_rgba"])),
            "tooltip": row["tooltip"],
            "sourceId": row["source_id"],
        }
        for row in render_flows
    ]
    commodity_options = [
        {
            "id": commodity_id,
            "name": commodity["commodity_name"],
            "group": commodity["commodity_group"],
            "color": next((flow["color"] for flow in flows if flow["commodityId"] == commodity_id), [160, 160, 160, 210]),
            "maxQuantity": max((flow["count"] for flow in flows if flow["commodityId"] == commodity_id), default=0),
        }
        for commodity_id, commodity in sorted(commodities.items())
        if any(flow["commodityId"] == commodity_id for flow in flows)
    ]
    return {
        "meta": {
            "title": "Global Commodity Trade Atlas v0.1",
            "targetYear": summary.target_year,
            "flowMode": "net",
            "unit": "tonne",
            "rawRows": summary.raw_rows,
            "tradeFlows": summary.trade_flows,
            "netTradeFlows": summary.net_trade_flows,
            "renderFlows": summary.render_flows,
            "generatedBy": "scripts/build_v01.py",
            "seedDataWarning": "BACI 2024 values may be revised by CEPII in later releases; latest year is provisional.",
        },
        "locations": locations,
        "flows": flows,
        "commodities": commodity_options,
    }


def write_placeholder_tables() -> None:
    for table_name, headers in PLACEHOLDER_TABLES.items():
        write_csv(PROCESSED_DIR / f"{table_name}.csv", [], headers)


def build() -> BuildSummary:
    datasets, visualisation = load_config()
    target_year = int(datasets["target_year"])
    raw_path = Path(str(datasets["raw_trade_path"]))

    if raw_path.suffix.lower() == ".zip":
        countries = build_countries_from_baci(raw_path)
        write_csv(REFERENCE_DIR / "countries.csv", countries, [
            "country_id",
            "iso3_code",
            "country_name",
            "region",
            "subregion",
            "latitude",
            "longitude",
            "valid_from",
            "valid_to",
            "notes",
        ])

    raw_rows = load_raw_trade_rows(datasets)

    copy_reference_tables()
    trade_flows = build_trade_flows(raw_rows, target_year)
    net_trade_flows = build_net_trade_flows(trade_flows)
    trade_metrics = build_trade_metrics(trade_flows)

    trade_flow_fields = [
        "flow_id",
        "year",
        "exporter_country_id",
        "importer_country_id",
        "commodity_id",
        "classification_system",
        "classification_version",
        "classification_code",
        "quantity_tonnes",
        "trade_value_usd_thousand",
        "source_dataset",
        "source_version",
        "mapping_confidence",
        "notes",
    ]
    net_flow_fields = [
        "net_flow_id",
        "year",
        "country_a_id",
        "country_b_id",
        "origin_country_id",
        "destination_country_id",
        "commodity_id",
        "gross_a_to_b_tonnes",
        "gross_b_to_a_tonnes",
        "net_quantity_tonnes",
        "net_direction",
        "source_trade_flow_ids",
    ]
    metric_fields = [
        "year",
        "country_id",
        "commodity_id",
        "total_import_tonnes",
        "total_export_tonnes",
        "net_import_tonnes",
        "net_export_tonnes",
        "number_of_suppliers",
        "largest_supplier_share",
        "herfindahl_hirschman_index",
        "notes",
    ]
    render_flow_fields = [
        "render_flow_id",
        "year",
        "origin_country_id",
        "destination_country_id",
        "origin_longitude",
        "origin_latitude",
        "destination_longitude",
        "destination_latitude",
        "commodity_id",
        "commodity_group",
        "quantity_tonnes",
        "visual_magnitude",
        "commodity_max_quantity_tonnes",
        "unit_id",
        "flow_mode",
        "color_rgba",
        "line_width",
        "source_table",
        "source_id",
        "tooltip",
    ]

    write_csv(PROCESSED_DIR / "raw_trade_baci.csv", raw_rows, list(raw_rows[0].keys()))
    write_csv(PROCESSED_DIR / "trade_flows.csv", trade_flows, trade_flow_fields)
    write_csv(PROCESSED_DIR / "net_trade_flows.csv", net_trade_flows, net_flow_fields)
    write_csv(PROCESSED_DIR / "trade_metrics.csv", trade_metrics, metric_fields)
    write_placeholder_tables()

    render_flows_all = build_render_flows(net_trade_flows, visualisation)
    render_flows = limit_render_flows(render_flows_all, visualisation)

    summary = BuildSummary(
        target_year=target_year,
        raw_rows=len(raw_rows),
        trade_flows=len(trade_flows),
        net_trade_flows=len(net_trade_flows),
        render_flows=len(render_flows),
        commodities=len({str(flow["commodity_id"]) for flow in trade_flows}),
        countries=len(
            {str(flow["exporter_country_id"]) for flow in trade_flows}
            | {str(flow["importer_country_id"]) for flow in trade_flows}
        ),
    )

    write_csv(RENDER_DIR / "render_flows.csv", render_flows, render_flow_fields)
    flowmap_json = build_flowmap_json(render_flows, summary)
    for output_dir in [RENDER_DIR, WEB_RENDER_DIR]:
        output_dir.mkdir(parents=True, exist_ok=True)
        with (output_dir / "flowmap.json").open("w", encoding="utf-8") as handle:
            json.dump(flowmap_json, handle, indent=2)
            handle.write("\n")
    with (PROCESSED_DIR / "build_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary.__dict__, handle, indent=2)
        handle.write("\n")
    return summary
