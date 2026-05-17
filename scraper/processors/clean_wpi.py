import json
import logging
from datetime import date
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3,
    "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9,
    "october": 10, "november": 11, "december": 12,
}


def _month_to_number(value) -> int | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    text = str(value).strip().lower()
    if text.isdigit():
        num = int(text)
        return num if 1 <= num <= 12 else None
    return MONTH_MAP.get(text)


def _build_product(row: pd.Series) -> str:
    parts = []
    for column in ["majorgroup", "group", "subgroup", "sub_subgroup", "item"]:
        if column in row and pd.notna(row[column]):
            value = str(row[column]).strip()
            if value and value.lower() != "nan":
                if not parts or parts[-1].lower() != value.lower():
                    parts.append(value)

    if not parts:
        return "WPI"

    return " > ".join(parts)[:100]


def clean(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    df = df.copy()
    print(f"  WPI raw columns: {list(df.columns)}")

    year_col = next((c for c in df.columns if c.lower() == "year"), None)
    month_col = next((c for c in df.columns if c.lower() in {"month", "month_code"}), None)
    price_col = next((c for c in df.columns if c.lower() in {"index_value", "index", "value", "wpi_value"}), None)

    if year_col is None or month_col is None or price_col is None:
        logger.error(
            "WPI data is missing one of the required columns: year, month, index_value.\n"
            f"Available columns: {list(df.columns)}"
        )
        return pd.DataFrame()

    df["year"] = pd.to_numeric(df[year_col], errors="coerce")
    df = df[df["year"].notna()]
    df["year"] = df["year"].astype(int)

    df["month"] = df[month_col].apply(_month_to_number)
    df = df[df["month"].notna()]
    df["month"] = df["month"].astype(int)

    df["price"] = pd.to_numeric(df[price_col], errors="coerce")
    df = df[df["price"].notna()]
    df = df[df["price"] > 0]

    for column in ["majorgroup", "group", "subgroup", "sub_subgroup", "item"]:
        if column not in df.columns:
            df[column] = None

    df["product"] = df.apply(_build_product, axis=1)
    df["city"] = "National"
    df["recorded_at"] = df.apply(lambda r: date(int(r["year"]), int(r["month"]), 1), axis=1)

    df = df[[
        "product", "city", "price", "recorded_at",
        "year", "month", "majorgroup", "group", "subgroup", "sub_subgroup", "item",
    ]].copy()
    df = df.drop_duplicates(subset=["product", "city", "recorded_at"], keep="last")
    df = df.sort_values(["product", "year", "month"]).reset_index(drop=True)

    print(
        f"  Cleaned WPI: {len(df)} rows | "
        f"years {df['year'].min()}–{df['year'].max()}"
    )
    return df


def from_json_file(path: str) -> pd.DataFrame:
    with open(path, encoding="utf-8") as f:
        records = json.load(f)
    if isinstance(records, dict):
        records = records.get("data", [])
    return clean(pd.DataFrame(records))