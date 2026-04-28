# Version 0.1 Tables

## Reference Tables

### `countries`

```text
country_id,iso3_code,country_name,region,subregion,latitude,longitude,valid_from,valid_to,notes
```

### `commodities`

```text
commodity_id,commodity_group,commodity_name,physical_unit_default,is_primary_resource,is_energy_carrier,is_food_related,is_mineral_related,notes
```

### `commodity_code_map`

```text
commodity_id,classification_system,classification_version,code,code_label,include_flag,mapping_confidence,notes
```

### `units`

```text
unit_id,unit_name,unit_type,conversion_to_base_unit,notes
```

## Layer 1 Trade Tables

### `raw_trade_baci`

```text
year,exporter_code,importer_code,hs_code,trade_value_usd_thousand,quantity_tonnes,source_dataset,source_version
```

### `trade_flows`

```text
flow_id,year,exporter_country_id,importer_country_id,commodity_id,classification_system,classification_version,classification_code,quantity_tonnes,trade_value_usd_thousand,source_dataset,source_version,mapping_confidence,notes
```

### `net_trade_flows`

```text
net_flow_id,year,country_a_id,country_b_id,origin_country_id,destination_country_id,commodity_id,gross_a_to_b_tonnes,gross_b_to_a_tonnes,net_quantity_tonnes,net_direction,source_trade_flow_ids
```

## Layer 5 Metrics

### `trade_metrics`

```text
year,country_id,commodity_id,total_import_tonnes,total_export_tonnes,net_import_tonnes,net_export_tonnes,number_of_suppliers,largest_supplier_share,herfindahl_hirschman_index,notes
```

## Prepared Layer Tables

The following tables are created as empty CSVs in v0.1 so later layers have stable landing zones:

- `production_sources`
- `domestic_uses`
- `processes`
- `process_flows`
- `render_particles`
- `render_columns`

## Render Table

### `render_flows`

```text
render_flow_id,year,origin_country_id,destination_country_id,origin_longitude,origin_latitude,destination_longitude,destination_latitude,commodity_id,commodity_group,quantity_tonnes,unit_id,flow_mode,color_rgba,line_width,source_table,source_id,tooltip
```
