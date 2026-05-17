import pandas as pd
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MONTH_MAP = {
    "january":1, "february":2,  "march":3,
    "april":4,   "may":5,       "june":6,
    "july":7,    "august":8,    "september":9,
    "october":10,"november":11, "december":12
}

QUARTER_MAP = {
    (1,2,3):   1,
    (4,5,6):   2,
    (7,8,9):   3,
    (10,11,12):4
}


def month_to_quarter(month: int) -> int:
    """Convert month number to quarter. e.g. 4 → 2"""
    for months, q in QUARTER_MAP.items():
        if month in months:
            return q
    return 0


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw MOSPI WRI API response.

    WRI API response fields will be similar to CPI:
    year | month/quarter | sector | state | index | inflation

    Adjust field names below once you see the actual
    WRI API response from your test run.
    """
    if df.empty:
        return df

    df = df.copy()
    print(f"  WRI raw columns: {list(df.columns)}")
    print(f"  WRI sample row: {df.iloc[0].to_dict()}")

    # ── Year ───────────────────────────────────────────────
    df['year'] = pd.to_numeric(df['year'], errors='coerce')
    df          = df[df['year'].notna()]
    df['year'] = df['year'].astype(int)

    # ── Month / Quarter ────────────────────────────────────
    # WRI may give monthly or quarterly data
    # If monthly: convert to quarter
    # If quarterly: use directly

    if 'month' in df.columns:
        df['month_num'] = (
            df['month'].astype(str).str.strip().str.lower()
            .map(MONTH_MAP)
        )
        df = df[df['month_num'].notna()]
        df['month']   = df['month_num'].astype(int)
        df['quarter'] = df['month'].apply(month_to_quarter)

    elif 'quarter' in df.columns:
        df['quarter'] = pd.to_numeric(df['quarter'], errors='coerce')
        df             = df[df['quarter'].notna()]
        df['quarter'] = df['quarter'].astype(int)
        df['month']   = None

    else:
        # No time column found — cannot process
        logger.error(
            "WRI data has no 'month' or 'quarter' column.\n"
            f"Available columns: {list(df.columns)}\n"
            "Check the WRI API response format."
        )
        return pd.DataFrame()

    # ── Sector ─────────────────────────────────────────────
    # WRI sectors: Agriculture, Industry, Services
    # Field may be called "sector", "group", or "industry"
    sector_col = next(
        (c for c in df.columns
         if c.lower() in ['sector','group','industry','category']),
        None
    )
    if sector_col:
        df['sector'] = df[sector_col].astype(str).str.strip()
    else:
        df['sector'] = 'All Sectors'

    # ── WRI value ──────────────────────────────────────────
    # Field is likely "index" (same pattern as CPI)
    value_col = next(
        (c for c in df.columns
         if c.lower() in ['index','wri','value','wri_index']),
        None
    )
    if value_col:
        df['wri_value'] = pd.to_numeric(df[value_col], errors='coerce')
    else:
        logger.error(
            f"No value column found. Columns: {list(df.columns)}"
        )
        return pd.DataFrame()

    df = df[df['wri_value'].notna()]
    df = df[df['wri_value'] > 0]

    # ── YoY inflation ──────────────────────────────────────
    if 'inflation' in df.columns:
        df['wri_yoy'] = pd.to_numeric(
            df['inflation'], errors='coerce'
        )
    else:
        df['wri_yoy'] = None

    # ── Keep standard columns ─────────────────────────────
    keep = ['sector','year','quarter','wri_value','wri_yoy']
    if 'month' in df.columns:
        keep.append('month')

    df = df[keep].copy()
    df = df.drop_duplicates(subset=['sector','year','quarter'])
    df = df.sort_values(['sector','year','quarter'])

    print(f"  Cleaned WRI: {len(df)} rows | "
          f"years {df['year'].min()}–{df['year'].max()}")

    return df