"""Run a single-month CPI fetch → clean → metrics → upsert flow.

Usage examples (PowerShell):

  # run for current month
  python scraper/run_monthly.py

  # run for specific year/month
  python scraper/run_monthly.py 2026 4

"""
from __future__ import annotations

import sys
import os
import json
import datetime
from typing import Optional

# Ensure repo root is on sys.path so `scraper` package imports work
# when this script is executed from the `scraper/` directory.
from pathlib import Path
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scraper.api_clients.mospi_client import MospiClient
from scraper.processors.clean_cpi import clean
from scraper.processors.calculate_metrics import add_cpi_metrics
from scraper.db.bulk_load import bulk_upsert_cpi


def _upsert_month_into_csv(path: str, month_df, key_cols: list[str]) -> int:
    import pandas as pd

    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        existing = pd.read_csv(path)
        combined = pd.concat([existing, month_df], ignore_index=True)
    else:
        combined = month_df.copy()

    combined = combined.drop_duplicates(subset=key_cols, keep='last')
    combined.to_csv(path, index=False)
    return len(combined)


def _save_raw(payload, prefix: str) -> str:
    folder = os.path.join('scraper', 'raw_data', 'cpi')
    os.makedirs(folder, exist_ok=True)
    ts = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
    fname = f"{prefix}_{ts}.json"
    path = os.path.join(folder, fname)
    with open(path, 'w', encoding='utf8') as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return path


def _payload_records(payload) -> list:
    if isinstance(payload, dict) and 'data' in payload:
        return payload['data']
    if isinstance(payload, list):
        return payload
    return []


def _is_all_india_only(records: list[dict]) -> bool:
    if not records:
        return False
    states = {
        str(r.get('state', '')).strip().lower()
        for r in records
        if isinstance(r, dict)
    }
    states.discard('')
    return states.issubset({'all india', 'india', 'national'})


def _fetch_statewise_month_records(
    client: MospiClient,
    year: int,
    month: int,
    base_year: int,
    max_state_code: int = 60,
) -> list[dict]:
    print('Trying per-state fallback via getCPIData state_code...')
    seen: set[tuple] = set()
    collected: list[dict] = []

    for state_code in range(1, max_state_code + 1):
        params = {
            'base_year': str(base_year),
            'year': str(year),
            'month_code': str(month),
            'state_code': str(state_code),
        }
        try:
            payload = client._request_json('/api/cpi/getCPIData', params, include_auth=False)
        except Exception:
            continue

        rows = _payload_records(payload)
        if not rows:
            continue

        for row in rows:
            if not isinstance(row, dict):
                continue

            state_name = str(row.get('state', '')).strip()
            if state_name.lower() in {'', 'all india', 'india', 'national'}:
                continue

            if str(row.get('year', '')).strip() != str(year):
                continue

            row_key = (
                str(row.get('year', '')).strip(),
                str(row.get('month', '')).strip().lower(),
                state_name.lower(),
                str(row.get('sector', '')).strip().lower(),
                str(row.get('division', '')).strip().lower(),
                str(row.get('group', '')).strip().lower(),
                str(row.get('code', '')).strip(),
            )
            if row_key in seen:
                continue
            seen.add(row_key)
            collected.append(row)

    unique_states = sorted({str(r.get('state', '')).strip() for r in collected if r.get('state')})
    print(f'Per-state fallback collected {len(collected)} rows across {len(unique_states)} states')
    return collected


def run(year: Optional[int] = None, month: Optional[int] = None, base_year: int = 2024):
    import pandas as pd
    
    now = datetime.datetime.now()
    year = year or now.year
    month = month or now.month

    print(f"Fetching CPI for {year}-{month:02d} (base {base_year})")
    c = MospiClient(token=None)  # Will auto-fetch token from creds if available
    # First try the month-specific endpoint which sometimes contains the latest months
    params = {
        "base_year": str(base_year),
        "year": str(year),
        "month_code": str(month),
    }

    payload = None
    try:
        print('Trying month-specific getCPIData endpoint...')
        try:
            payload = c._request_json('/api/cpi/getCPIData', params, include_auth=True)
        except Exception as e1:
            print('getCPIData with auth failed:', e1)
            # try unauthenticated raw GET
            qs = '&'.join(f"{k}={v}" for k, v in params.items())
            raw_url = f"{c.base_url}/api/cpi/getCPIData?{qs}"
            try:
                resp = c.session.get(raw_url, timeout=c.timeout, verify=False, headers=c._headers(include_auth=False))
                resp.raise_for_status()
                payload = resp.json()
            except Exception as e2:
                print('getCPIData unauthenticated GET failed:', e2)

    except Exception:
        payload = None

    # If month-specific endpoint returned rows, use them (but still fetch full series for metrics)
    records = _payload_records(payload)

    if records:
        if _is_all_india_only(records):
            state_rows = _fetch_statewise_month_records(c, int(year), int(month), int(base_year), max_state_code=60)
            if state_rows:
                records.extend(state_rows)

        raw_path = _save_raw({'data': records}, f"mospi_getCPIData_{year}_{month:02d}")
        print('Saved raw month payload to', raw_path)
        print(f'Target-month records from getCPIData: {len(records)}')
        # We still need the full series to compute MoM/YoY/moving averages
        try:
            series_name = f"Current_Series_{base_year}"
            print(f"Fetching full {series_name} for metrics...")
            series_payload = c.fetch_cpi_series(series_name, raw=True, page_size=50000, max_pages=2000)
        except Exception as e:
            print('Series fetch failed (needed for metrics):', e)
            return

        df_all = pd.DataFrame(series_payload if isinstance(series_payload, list) else series_payload.get('data', []))
        cleaned_all = clean(df_all)

        # Clean target-month raw records and merge with full series so metrics include the new month
        df_target = pd.DataFrame(records)
        cleaned_target = clean(df_target)

        # Combine and deduplicate so target-month rows overwrite any older duplicates
        if not cleaned_target.empty:
            combined = pd.concat([cleaned_all, cleaned_target], ignore_index=True)
            combined = combined.drop_duplicates(subset=['category', 'segment', 'state', 'year', 'month'], keep='last')
        else:
            combined = cleaned_all

        metrics_all = add_cpi_metrics(combined)

        # Build cleaned target-month metrics from metrics_all
        metrics = metrics_all[(metrics_all['year'] == int(year)) & (metrics_all['month'] == int(month))]

    else:
        # Fall back to fetching full series and filter there
        series_name = f"Current_Series_{base_year}"
        print(f"Fetching full {series_name}...")
        try:
            payload = c.fetch_cpi_series(series_name, raw=True, page_size=50000, max_pages=2000)
        except Exception as e:
            print(f'Series fetch failed: {e}')
            # Fallback: try getCPIIndex
            try:
                print('Trying getCPIIndex fallback')
                payload = c.fetch_cpi_index(base_year=base_year, raw=True)
            except Exception as e2:
                print(f'getCPIIndex fallback failed: {e2}')
                return

        raw_path = _save_raw(payload, f"mospi_series_{base_year}_{year}_{month:02d}")
        print(f'Saved raw payload to {raw_path}')

        records = payload['data'] if isinstance(payload, dict) and 'data' in payload else (payload if isinstance(payload, list) else [])
        if not records:
            print('No records returned')
            return

        print(f'Total records from API: {len(records)}')

        df = pd.DataFrame(records)
        cleaned_all = clean(df)
        metrics_all = add_cpi_metrics(cleaned_all)
        metrics = metrics_all[(metrics_all['year'] == int(year)) & (metrics_all['month'] == int(month))]

    if metrics.empty:
        print(f'No records for {year}-{month:02d} in cleaned/metrics data')
        print(f'  (cleaned {len(cleaned_all)} rows, target year/month not found)')
        return

    print(f'Found {len(metrics)} rows for {year}-{month:02d}')

    # Keep local CSV snapshots in sync with monthly ingestion.
    cleaned_csv_path = os.path.join('scraper', 'cleaned_data', 'cpi_cleaned.csv')
    metrics_csv_path = os.path.join('scraper', 'cleaned_data', 'cpi_metrics.csv')

    cleaned_total = _upsert_month_into_csv(
        cleaned_csv_path,
        metrics[['category', 'segment', 'state', 'month', 'year', 'value']].copy(),
        ['category', 'segment', 'state', 'month', 'year'],
    )
    metrics_total = _upsert_month_into_csv(
        metrics_csv_path,
        metrics.copy(),
        ['category', 'segment', 'state', 'month', 'year'],
    )
    print(f'Updated CSV: {cleaned_csv_path} (total rows={cleaned_total})')
    print(f'Updated CSV: {metrics_csv_path} (total rows={metrics_total})')

    # Prepare tuples for bulk upsert
    tuples = []
    for _, r in metrics.iterrows():
        tuples.append((
            r.get('category'), r.get('segment'), r.get('state') or 'National',
            int(r['month']), int(r['year']),
            None if pd.isna(r.get('value')) else float(r.get('value')),
            None if pd.isna(r.get('mom_change')) else float(r.get('mom_change')),
            None if pd.isna(r.get('yoy_change')) else float(r.get('yoy_change')),
            None if pd.isna(r.get('moving_avg')) else float(r.get('moving_avg')),
        ))

    print(f'Upserting {len(tuples)} rows to DB')
    result = bulk_upsert_cpi(tuples, chunk_size=1000)
    print('Upsert result:', result)


if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) >= 2:
        run(int(args[0]), int(args[1]))
    elif len(args) == 1:
        run(int(args[0]), None)
    else:
        run()
