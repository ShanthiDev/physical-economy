#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from physical_economy.pipeline import build


if __name__ == "__main__":
    summary = build()
    print(
        "Built v0.1: "
        f"{summary.trade_flows} trade_flows, "
        f"{summary.net_trade_flows} net_trade_flows, "
        f"{summary.commodities} commodities, "
        f"{summary.countries} countries for {summary.target_year}."
    )
