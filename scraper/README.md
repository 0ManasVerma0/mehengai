# Scraper Runbook

This file lists commands to load CPI, WPI, and WRI data.

Run all commands from the repository root:

```powershell
cd C:\Important\programming\mehengai\mehengai
```

## CPI commands

Load monthly CPI for the current month:

```powershell
python scraper/main.py --mode monthly --load
```

Load CPI for a specific month (example: April 2026):

```powershell
python scraper/main.py --mode monthly --years 2026 --months 4 --load --force
```

Backfill CPI history:

```powershell
python scraper/main.py --mode full --load
```

## WPI commands

Load monthly WPI for the current month:

```powershell
python scraper/run_wpi.py --load
```

Load WPI for a specific month (example: April 2026):

```powershell
python scraper/run_wpi.py 2026 4 --load
```

Backfill WPI history:

```powershell
python scraper/run_wpi.py --mode full --load
```

## WRI commands

Load a new WRI Excel file into DB (clean + metrics + upsert):

```powershell
python scraper/run_wri_excel.py "C:\path\to\new_wri.xlsx" --db
```

Only generate cleaned CSV outputs from WRI Excel:

```powershell
python scraper/run_wri_excel.py "C:\path\to\new_wri.xlsx"
```

Upsert from existing metrics CSV:

```powershell
python scraper/scripts/upsert_wri_metrics.py
```

## Combined monthly CPI + WPI

Run CPI and WPI for previous month (used for monthly schedule on 15th):

```powershell
python scraper/run_monthly_all.py
```

Run combined for a specific year/month (example: April 2026):

```powershell
python scraper/run_monthly_all.py 2026 4
```

## Examples

Example 1: Monthly manual run on 15th (loads previous month CPI + WPI)

```powershell
python scraper/run_monthly_all.py
```

Example 2: New WRI file arrives and you want to load it

```powershell
python scraper/run_wri_excel.py "C:\Data\WRI_May_2026.xlsx" --db
```

Example 3: Recompute and upsert WRI from existing metrics CSV

```powershell
python scraper/scripts/upsert_wri_metrics.py
```

Example 4: Verify row counts after any load

```powershell
python -c "from db.load_data import verify; verify()"
```