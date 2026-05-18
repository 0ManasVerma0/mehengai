"""Run the monthly CPI and WPI pipelines for the previous month.

This is meant to be scheduled on the 15th of each month, so by default it
processes the full previous month rather than the current month.

Usage examples (PowerShell):

  # run for the previous month
  python scraper/run_monthly_all.py

  # run for a specific year/month when testing
  python scraper/run_monthly_all.py 2026 4
"""
from __future__ import annotations

import argparse
import datetime as _dt
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent


def _previous_month() -> tuple[int, int]:
	today = _dt.date.today()
	first_day_of_current_month = today.replace(day=1)
	last_day_of_previous_month = first_day_of_current_month - _dt.timedelta(days=1)
	return last_day_of_previous_month.year, last_day_of_previous_month.month


def _run_command(command: list[str]) -> None:
	print("\nRunning:", " ".join(command))
	result = subprocess.run(command, cwd=str(BASE_DIR))
	if result.returncode != 0:
		raise SystemExit(result.returncode)


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description="Run CPI and WPI monthly pipelines")
	parser.add_argument("year", nargs="?", type=int, help="Optional year for a test run")
	parser.add_argument("month", nargs="?", type=int, help="Optional month for a test run")
	return parser


def main() -> None:
	args = build_parser().parse_args()
	if args.year is None or args.month is None:
		year, month = _previous_month()
	else:
		year, month = args.year, args.month

	python = sys.executable

	_run_command([python, str(BASE_DIR / "run_monthly.py"), str(year), str(month), "--load"])
	_run_command([python, str(BASE_DIR / "run_wpi.py"), str(year), str(month), "--load"])

	print("\nMonthly CPI + WPI pipeline completed.")


if __name__ == "__main__":
	main()
