import pandas as pd
import json
import logging
from pathlib import Path

logger       = logging.getLogger(__name__)
CLEANED_DATA = Path(__file__).resolve().parent.parent / "cleaned_data"
CLEANED_DATA.mkdir(exist_ok=True)

MONTH_MAP = {
    "january":1, "february":2,  "march":3,
    "april":4,   "may":5,       "june":6,
    "july":7,    "august":8,    "september":9,
    "october":10,"november":11, "december":12
}

SEGMENT_MAP = {
    "rural":    "rural",
    "urban":    "urban",
    "combined": "combined",
    "r":        "rural",
    "u":        "urban",
    "c":        "combined"
}


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw MOSPI API response into standard DB-ready format.

    MOSPI API returns these fields (from the manual):
      baseyear  | year | month  | state    | sector
      group     | subgroup      | index    | inflation | status

    We transform this into:
      category  | segment | state | month | year | value
      mom_change | yoy_change | moving_avg
    """
    if df.empty:
        return df

    df = df.copy()

    # Print what we got for debugging
    print(f"  Raw columns: {list(df.columns)}")

    # ── Month → number ─────────────────────────────────────
    df['month_num'] = (
        df['month']
        .astype(str)
        .str.strip()
        .str.lower()
        .map(MONTH_MAP)
    )
    df = df[df['month_num'].notna()]
    df['month'] = df['month_num'].astype(int)

    # ── Year ───────────────────────────────────────────────
    df['year'] = pd.to_numeric(df['year'], errors='coerce')
    df          = df[df['year'].notna()]
    df['year'] = df['year'].astype(int)
    df          = df[df['year'].between(2010, 2035)]

    # If the API provided a `baseyear` column, prefer the 2024 base-series
    # for records where the year is >= 2024. This handles mixed-series
    # payloads (both 2012 and 2024 base) by keeping 2024-based rows
    # when available for the same category/segment/state/month/year.
    if 'baseyear' in df.columns:
        df['baseyear'] = df['baseyear'].astype(str)
        future_mask = df['year'] >= 2024
        if future_mask.any():
            keys = ['group', 'sector', 'state', 'month', 'year']
            sub = df[future_mask]
            present_2024 = (
                sub[sub['baseyear'].str.contains('2024')]
                .groupby(keys)
                .size()
                .reset_index()[keys]
            )
            set_2024 = set(tuple(x) for x in present_2024.values.tolist())

            def _keep_row(r):
                key = (r['group'], r['sector'], r['state'], r['month'], r['year'])
                if key in set_2024:
                    return '2024' in str(r['baseyear'])
                return True

            df = df[df.apply(_keep_row, axis=1)]

    # ── Segment (MOSPI calls this "sector") ────────────────
    df['segment'] = (
        df['sector']
        .astype(str)
        .str.strip()
        .str.lower()
        .map(lambda x: SEGMENT_MAP.get(x, 'combined'))
    )

    # ── State ──────────────────────────────────────────────
    df['state'] = df['state'].astype(str).str.strip()
    df['state'] = df['state'].replace({
        'All India': 'National',
        'all india': 'National',
        'ALL INDIA': 'National',
        'India':     'National'
    })

    # ── Category (MOSPI calls this "group") ────────────────
    # Some MOSPI endpoints use 'group' while others (getCPIData) provide 'division'.
    # Prefer 'group' when present, otherwise fall back to 'division'.
    if 'group' in df.columns and 'division' in df.columns:
        df['category'] = df['group'].fillna(df['division']).astype(str).str.strip()
    elif 'group' in df.columns:
        df['category'] = df['group'].astype(str).str.strip()
    elif 'division' in df.columns:
        df['category'] = df['division'].astype(str).str.strip()
    else:
        df['category'] = ''

    # ── Value (MOSPI calls this "index") ───────────────────
    df['value'] = pd.to_numeric(df['index'], errors='coerce')
    df           = df[df['value'].notna()]
    df           = df[df['value'] > 0]

    # ── YoY inflation (MOSPI provides this directly) ───────
    # We store it as api_yoy — will be used in metrics step
    df['api_yoy'] = pd.to_numeric(
        df['inflation'], errors='coerce'
    )

    # ── Keep only what we need ─────────────────────────────
    df = df[[
        'category', 'segment', 'state',
        'month', 'year', 'value', 'api_yoy'
    ]].copy()

    # ── Remove duplicates ──────────────────────────────────
    df = df.drop_duplicates(
        subset=['category','segment','state','month','year'],
        keep='last'
    )

    df = df.sort_values(
        ['category','segment','state','year','month']
    ).reset_index(drop=True)

    print(f"  Cleaned: {len(df)} rows | "
          f"years {df['year'].min()}–{df['year'].max()} | "
          f"segments: {list(df['segment'].unique())}")

    return df


def from_json_file(path: str) -> pd.DataFrame:
    """Load from saved JSON file and clean."""
    with open(path) as f:
        records = json.load(f)
    return clean(pd.DataFrame(records))