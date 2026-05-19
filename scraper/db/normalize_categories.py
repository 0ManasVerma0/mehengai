"""One-off migration: align 2026 getCPIData division labels with historical group names."""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scraper.db.connection import get_connection

RENAME_MAP = {
    "CPI (General)": "General",
    "Food and beverages": "Food and Beverages",
    "Clothing and footwear": "Clothing and Footwear",
    "Housing, water, electricity, gas and other fuels": "Housing",
    "Paan, tobacco and intoxicants": "Pan, Tobacco and Intoxicants",
}


def main() -> None:
    conn = get_connection()
    cur = conn.cursor()
    total = 0

    for old_name, new_name in RENAME_MAP.items():
        cur.execute(
            """
            UPDATE cpi_data
            SET category = %s
            WHERE category = %s
              AND NOT EXISTS (
                SELECT 1
                FROM cpi_data existing
                WHERE existing.category = %s
                  AND existing.segment = cpi_data.segment
                  AND existing.state = cpi_data.state
                  AND existing.month = cpi_data.month
                  AND existing.year = cpi_data.year
              )
            """,
            (new_name, old_name, new_name),
        )
        updated = cur.rowcount
        total += updated
        print(f"  {old_name!r} -> {new_name!r}: {updated} rows")

    conn.commit()
    cur.close()
    conn.close()
    print(f"Done. Renamed {total} rows.")


if __name__ == "__main__":
    main()
