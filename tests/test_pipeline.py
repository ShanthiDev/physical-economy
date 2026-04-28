from pathlib import Path
import sys
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from physical_economy.pipeline import build, read_csv
from physical_economy.paths import PROCESSED_DIR, RENDER_DIR


class PipelineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.summary = build()

    def test_build_v01_outputs_acceptance_tables(self) -> None:
        summary = self.summary

        self.assertEqual(summary.target_year, 2024)
        self.assertGreater(summary.trade_flows, 1_000)
        self.assertGreater(summary.net_trade_flows, 1_000)
        self.assertGreaterEqual(summary.commodities, 20)
        self.assertLessEqual(summary.render_flows, 21 * 80)

        trade_flows = read_csv(PROCESSED_DIR / "trade_flows.csv")
        net_flows = read_csv(PROCESSED_DIR / "net_trade_flows.csv")
        render_flows = read_csv(RENDER_DIR / "render_flows.csv")

        self.assertTrue(trade_flows)
        self.assertTrue(net_flows)
        self.assertTrue(render_flows)
        self.assertGreaterEqual(
            {row["commodity_id"] for row in trade_flows},
            {"crude_oil", "hard_coal", "wheat", "iron_ore", "natural_gas"},
        )

    def test_render_flows_include_tooltip_quantities_and_scaled_widths(self) -> None:
        render_flows = read_csv(RENDER_DIR / "render_flows.csv")

        first_flow = render_flows[0]
        self.assertIn("tonnes net", first_flow["tooltip"])
        self.assertIn("gross", first_flow["tooltip"])
        self.assertGreater(float(first_flow["visual_magnitude"]), 0)
        self.assertGreaterEqual(float(first_flow["line_width"]), 1.4)
        self.assertLessEqual(float(first_flow["line_width"]), 11.0)


if __name__ == "__main__":
    unittest.main()
