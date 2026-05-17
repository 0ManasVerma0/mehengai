"""Run a WPI fetch -> clean -> metrics -> price_tracker upsert flow.

Usage examples (PowerShell):

  # run for current month
  python scraper/run_wpi.py

  # run for a specific year/month
  python scraper/run_wpi.py 2026 4

  # run historical backfill
  python scraper/run_wpi.py --mode full
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
from pathlib import Path

import pandas as pd

# Ensure repo root is on sys.path so `scraper` package imports work
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scraper.api_clients.mospi_client import MospiClient
from scraper.db.load_data import load_prices, verify
from scraper.processors.calculate_metrics import add_wpi_metrics
from scraper.processors.clean_wpi import clean as clean_wpi


BASE_DIR = Path(__file__).resolve().parent
RAW_WPI_DIR = BASE_DIR / "raw_data" / "wpi"
CLEANED_DIR = BASE_DIR / "cleaned_data"


def ensure_output_dirs() -> None:
    RAW_WPI_DIR.mkdir(parents=True, exist_ok=True)
    CLEANED_DIR.mkdir(parents=True, exist_ok=True)


def parse_csv_ints(value: str | None) -> list[int] | None:
    if value is None or value.strip() == "":
        return None
    return [int(part.strip()) for part in value.split(",") if part.strip()]


def expand_periods(mode: str, years: list[int] | None, months: list[int] | None) -> tuple[list[int], list[int]]:
    now = datetime.datetime.now()

    if years is None:
        years = [now.year] if mode == "monthly" else list(range(2010, 2026))

    if months is None:
        months = [now.month] if mode == "monthly" else list(range(1, 13))

    return years, months


def load_raw_payload(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _save_raw(payload, prefix: str) -> Path:
    ts = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")
    path = RAW_WPI_DIR / f"{prefix}_{ts}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def collect_wpi_year_records(client: MospiClient, years: list[int], force: bool = False) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []

    for year in years:
        raw_path = RAW_WPI_DIR / f"wpi_{year}.json"

        if raw_path.exists() and not force:
            payload = load_raw_payload(raw_path)
        else:
            payload = client.fetch_wpi_records(base_year="2011-12", year=year, format_name="JSON", raw=True)
            raw_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

        records = payload.get("data", []) if isinstance(payload, dict) else payload
        if records:
            frame = pd.DataFrame(records)
            frame["source_year"] = year
            frames.append(frame)
            print(f"  Collected WPI {year}: {len(frame)} rows")
        else:
            print(f"  No WPI rows returned for {year}")

    if not frames:
        return pd.DataFrame()

    return pd.concat(frames, ignore_index=True)


def collect_wpi_month_records(client: MospiClient, years: list[int], months: list[int], force: bool = False) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []

    for year in years:
        for month in months:
            raw_path = RAW_WPI_DIR / f"wpi_{year}_{month:02d}.json"

            if raw_path.exists() and not force:
                payload = load_raw_payload(raw_path)
            else:
                payload = client.fetch_wpi_records(
                    base_year="2011-12",
                    year=year,
                    month_code=month,
                    format_name="JSON",
                    raw=True,
                )
                raw_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

            records = payload.get("data", []) if isinstance(payload, dict) else payload
            if records:
                frame = pd.DataFrame(records)
                frame["source_year"] = year
                frame["source_month"] = month
                frames.append(frame)
                print(f"  Collected WPI {year}-{month:02d}: {len(frame)} rows")
            else:
                print(f"  No WPI rows returned for {year}-{month:02d}")

    if not frames:
        return pd.DataFrame()

    return pd.concat(frames, ignore_index=True)


def save_dataframe(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def run_pipeline(mode: str, years: list[int] | None, months: list[int] | None, load: bool, force: bool) -> None:
    ensure_output_dirs()
    years, months = expand_periods(mode, years, months)

    print("── Collecting WPI Data ─────────────────────")
    client = MospiClient()
    if mode == "full":
        raw_df = collect_wpi_year_records(client, years, force=force)
    else:
        raw_df = collect_wpi_month_records(client, years, months, force=force)

    if raw_df.empty:
        print("No WPI data collected.")
        return

    print("\n── Cleaning WPI Data ───────────────────────")
    cleaned_df = clean_wpi(raw_df)
    if cleaned_df.empty:
        print("No cleaned WPI rows available.")
        return

    metrics_df = add_wpi_metrics(cleaned_df)

    save_dataframe(cleaned_df, CLEANED_DIR / "wpi_cleaned.csv")
    save_dataframe(metrics_df, CLEANED_DIR / "wpi_metrics.csv")

    print(f"\nSaved cleaned WPI data to {CLEANED_DIR / 'wpi_cleaned.csv'}")
    print(f"Saved WPI metrics to {CLEANED_DIR / 'wpi_metrics.csv'}")

    if load:
        print("\n── Loading to Database ─────────────────────")
        load_prices(metrics_df[["product", "city", "price", "recorded_at"]])
        verify()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Mehengai WPI pipeline")
    parser.add_argument("year", nargs="?", type=int, help="Optional year for a single monthly run")
    parser.add_argument("month", nargs="?", type=int, help="Optional month for a single monthly run")
    parser.add_argument(
        "--mode",
        choices=["monthly", "full"],
        default="monthly",
        help="monthly collects the latest period; full collects yearly WPI history",
    )
    parser.add_argument(
        "--years",
        help="Comma-separated years to fetch, e.g. 2024,2025",
    )
    parser.add_argument(
        "--months",
        help="Comma-separated months to fetch, e.g. 1,2,3",
    )
    parser.add_argument(
        "--load",
        action="store_true",
        help="Load the cleaned data into the database",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download raw WPI payloads even when cached files already exist",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.year is not None:
        years = [args.year]
        months = [args.month] if args.month is not None else None
        mode = "monthly"
    else:
        years = parse_csv_ints(args.years)
        months = parse_csv_ints(args.months)
        mode = args.mode
    run_pipeline(mode, years, months, args.load, args.force)


if __name__ == "__main__":
    main()