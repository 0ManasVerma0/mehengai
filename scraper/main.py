from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

import pandas as pd

from api_clients.mospi_client import MospiClient
from db.load_data import load_cpi, verify
from processors.calculate_metrics import add_cpi_metrics
from processors.clean_cpi import clean as clean_cpi


BASE_DIR = Path(__file__).resolve().parent
RAW_CPI_DIR = BASE_DIR / "raw_data" / "cpi"
CLEANED_DIR = BASE_DIR / "cleaned_data"


def ensure_output_dirs() -> None:
	RAW_CPI_DIR.mkdir(parents=True, exist_ok=True)
	CLEANED_DIR.mkdir(parents=True, exist_ok=True)


def parse_csv_ints(value: str | None) -> list[int] | None:
	if value is None or value.strip() == "":
		return None
	return [int(part.strip()) for part in value.split(",") if part.strip()]


def expand_periods(mode: str, years: list[int] | None, months: list[int] | None) -> tuple[list[int], list[int]]:
	now = datetime.now()

	if years is None:
		years = [now.year] if mode == "monthly" else list(range(2010, now.year + 1))

	if months is None:
		months = [now.month] if mode == "monthly" else list(range(1, 13))

	return years, months


def load_raw_payload(path: Path) -> dict:
	return json.loads(path.read_text(encoding="utf-8"))


def collect_cpi_series_records(client: MospiClient, force: bool = False) -> pd.DataFrame:
	series_names = ["Current_Series_2012", "Current_Series_2024"]
	frames: list[pd.DataFrame] = []

	for series_name in series_names:
		raw_path = RAW_CPI_DIR / f"{series_name}.json"

		if raw_path.exists() and not force:
			payload = load_raw_payload(raw_path)
		else:
			payload = client.fetch_cpi_series(series_name, format_name="JSON", raw=True)
			raw_path.write_text(
				json.dumps(payload, indent=2, ensure_ascii=False),
				encoding="utf-8",
			)

		records = payload.get("data", []) if isinstance(payload, dict) else payload
		if records:
			frame = pd.DataFrame(records)
			frame["source_series"] = series_name
			frames.append(frame)
			print(f"  Collected series {series_name}: {len(frame)} rows")
		else:
			print(f"  No rows returned for series {series_name}")

	if not frames:
		return pd.DataFrame()

	return pd.concat(frames, ignore_index=True)


def collect_cpi_records(
	client: MospiClient,
	years: list[int],
	months: list[int],
	force: bool = False,
) -> pd.DataFrame:
	frames: list[pd.DataFrame] = []

	for year in years:
		for month in months:
			raw_path = RAW_CPI_DIR / f"cpi_{year}_{month:02d}.json"

			if raw_path.exists() and not force:
				payload = load_raw_payload(raw_path)
			else:
				payload = client.fetch_cpi_index(
					year=year,
					month=month,
					format_name="JSON",
					raw=True,
					base_year=(2024 if year >= 2024 else ""),
				)
				raw_path.write_text(
					json.dumps(payload, indent=2, ensure_ascii=False),
					encoding="utf-8",
				)

			records = payload.get("data", []) if isinstance(payload, dict) else payload
			if records:
				frame = pd.DataFrame(records)
				frame["source_year"] = year
				frame["source_month"] = month
				frames.append(frame)
				print(f"  Collected CPI {year}-{month:02d}: {len(frame)} rows")
			else:
				print(f"  No CPI rows returned for {year}-{month:02d}")

	if not frames:
		return pd.DataFrame()

	return pd.concat(frames, ignore_index=True)


def save_dataframe(df: pd.DataFrame, path: Path) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	df.to_csv(path, index=False)


def run_pipeline(mode: str, years: list[int] | None, months: list[int] | None, load: bool, force: bool) -> None:
	ensure_output_dirs()
	years, months = expand_periods(mode, years, months)

	print("── Collecting CPI Data ─────────────────────")
	client = MospiClient()
	if mode == "full":
		raw_df = collect_cpi_series_records(client, force=force)
	else:
		raw_df = collect_cpi_records(client, years, months, force=force)

	if raw_df.empty:
		print("No CPI data collected.")
		return

	print("\n── Cleaning CPI Data ───────────────────────")
	cleaned_df = clean_cpi(raw_df)
	if mode == "full" and not cleaned_df.empty:
		cleaned_df = cleaned_df[cleaned_df["year"].between(min(years), max(years))]
		cleaned_df = cleaned_df[cleaned_df["month"].isin(months)]
		cleaned_df = cleaned_df.reset_index(drop=True)
	metrics_df = add_cpi_metrics(cleaned_df)

	save_dataframe(cleaned_df, CLEANED_DIR / "cpi_cleaned.csv")
	save_dataframe(metrics_df, CLEANED_DIR / "cpi_metrics.csv")

	print(f"\nSaved cleaned CPI data to {CLEANED_DIR / 'cpi_cleaned.csv'}")
	print(f"Saved CPI metrics to {CLEANED_DIR / 'cpi_metrics.csv'}")

	if load:
		print("\n── Loading to Database ─────────────────────")
		load_cpi(metrics_df)
		verify()


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Mehengai data pipeline")
	parser.add_argument(
		"--mode",
		choices=["monthly", "full"],
		default="monthly",
		help="monthly collects the latest period; full collects all periods since 2012",
	)
	parser.add_argument(
		"--years",
		help="Comma-separated years to fetch, e.g. 2023,2024",
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
		help="Re-download raw CPI payloads even when cached files already exist",
	)
	return parser


def main() -> None:
	args = build_parser().parse_args()
	years = parse_csv_ints(args.years)
	months = parse_csv_ints(args.months)
	run_pipeline(args.mode, years, months, args.load, args.force)


if __name__ == "__main__":
	main()
