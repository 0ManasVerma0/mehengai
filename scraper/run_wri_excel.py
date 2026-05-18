import argparse
from pathlib import Path
import pandas as pd

from processors.clean_wri import clean as clean_wri
from processors import calculate_metrics
from db.load_data import load_wri


DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / 'cleaned_data'


def pick_sheet(excel_path: Path):
    xls = pd.ExcelFile(excel_path)
    for name in ['WRI', 'Sheet1', 'wri', 'data']:
        if name in xls.sheet_names:
            return name
    return xls.sheet_names[0]


def _normalize_header_df(df: pd.DataFrame) -> pd.DataFrame:
    """Detect header row in messy Excel exports and normalize column names."""
    raw = df.copy()
    # If DataFrame already has sensible columns, return as-is
    cols = [str(c).strip().lower() for c in raw.columns]
    if any('year' == c or 'period' in c or 'wri' in c for c in cols):
        return raw

    # Otherwise, the true header may be in the first few rows
    header_row = None
    for i in range(min(10, len(raw))):
        row_vals = [str(x).strip().lower() for x in raw.iloc[i].values if pd.notna(x)]
        if any(v in row_vals for v in ['year', 'period as on', 'period', 'wri index', 'wri']):
            header_row = i
            break

    if header_row is None:
        return raw

    new_cols = raw.iloc[header_row].astype(str).str.strip()
    df2 = raw.iloc[header_row + 1 :].copy().reset_index(drop=True)
    df2.columns = new_cols

    # Simple mapping to expected column names
    col_map = {}
    for c in df2.columns:
        lc = str(c).strip().lower()
        if 'base' in lc:
            col_map[c] = 'base_year'
        elif 'year' in lc:
            col_map[c] = 'year'
        elif 'period' in lc or 'period as on' in lc or 'month' in lc:
            # keep as 'month' for cleaner to detect monthly data
            col_map[c] = 'month'
        elif 'quarter' in lc:
            col_map[c] = 'quarter'
        elif 'sector' in lc:
            col_map[c] = 'sector'
        elif ('wri' in lc and 'index' in lc) or 'wri index' in lc or lc == 'wri' or 'wri' in lc:
            col_map[c] = 'wri'

    df2 = df2.rename(columns=col_map)
    # Normalize month-like cell values to plain month name where possible
    month_names = [
        'january','february','march','april','may','june',
        'july','august','september','october','november','december'
    ]
    def _extract_month(val):
        s = str(val).lower()
        for m in month_names:
            if m in s:
                return m
        return s
    if 'month' in df2.columns:
        df2['month'] = df2['month'].apply(_extract_month)
    # Merge duplicate column names by coalescing non-null values
    from collections import Counter
    counts = Counter(df2.columns)
    for col, cnt in counts.items():
        if cnt > 1:
            cols = [c for c in df2.columns if c == col]
            df2[col] = df2[cols].apply(
                lambda row: next((x for x in row if pd.notna(x)), None),
                axis=1
            )
    # Drop duplicate column entries, keep first occurrence
    df2 = df2.loc[:, ~df2.columns.duplicated()]
    return df2


def run(excel_path: str, do_db: bool = False):
    p = Path(excel_path)
    if not p.exists():
        raise FileNotFoundError(f"WRI Excel not found: {p}")

    print(f"Reading WRI Excel: {p}")
    sheet = pick_sheet(p)
    df_raw = pd.read_excel(p, sheet_name=sheet, header=None)

    print("Normalizing header and cleaning WRI data...")
    df_norm = _normalize_header_df(df_raw)

    def _massage_columns(df):
        # If df already has expected columns, use them directly
        if {'year','sector','month','wri'}.issubset(set(df.columns)):
            out = pd.DataFrame()
            out['year'] = pd.to_numeric(df['year'], errors='coerce')
            out['sector'] = df['sector'].astype(str).str.strip()
            out['month'] = df['month'].astype(str).str.strip().str.lower()
            out['wri'] = pd.to_numeric(df['wri'], errors='coerce')
            # If year column is constant (likely base year), try to extract actual data year from sector text
            if out['year'].nunique() == 1:
                import re
                def extract_year(s):
                    m = re.search(r"(20\d{2})", str(s))
                    return int(m.group(1)) if m else None

                extracted = out['sector'].apply(extract_year)
                if extracted.notna().any():
                    out['year'] = extracted.fillna(out['year'])
                    # remove trailing year from sector text
                    out['sector'] = out['sector'].astype(str).str.replace(r"\s*20\d{2}$", "", regex=True).str.strip()
            return out

        # Ensure each row has year, sector, month, wri by scanning cells
        month_names = [
            'january','february','march','april','may','june',
            'july','august','september','october','november','december'
        ]
        rows = []
        for _, row in df.iterrows():
            year = None
            sector = None
            month = None
            wri = None
            for v in row.values:
                if pd.isna(v):
                    continue
                s = str(v).strip()
                # year detection
                try:
                    iv = int(float(s))
                    if 2016 <= iv <= 2024 and year is None:
                        year = iv
                        continue
                except Exception:
                    pass

                ls = s.lower()
                # month detection
                for m in month_names:
                    if m in ls:
                        month = m
                        break

                # numeric wri detection
                try:
                    fv = float(s)
                    # plausible WRI range
                    if 30.0 <= fv <= 300.0 and wri is None:
                        wri = fv
                        continue
                except Exception:
                    pass

                # sector detection (textual) — prefer values containing letters
                if sector is None and any(ch.isalpha() for ch in s):
                    # avoid header labels
                    if s.lower() not in ['s.no','s.no.','base year','base']:
                        sector = s

            rows.append({'year': year, 'sector': sector, 'month': month, 'wri': wri})

        return pd.DataFrame(rows)

    df_m = _massage_columns(df_norm)
    df_wri = clean_wri(df_m)

    # Try to load CPI metrics (prefer metrics with YoY) for real wage calc
    cleaned_dir = Path(__file__).resolve().parent / 'cleaned_data'
    cpi_metrics = cleaned_dir / 'cpi_metrics.csv'
    cpi_cleaned = cleaned_dir / 'cpi_cleaned.csv'
    df_cpi = None
    if cpi_metrics.exists():
        print(f"Loading CPI metrics reference from {cpi_metrics}")
        df_cpi = pd.read_csv(cpi_metrics)
    elif cpi_cleaned.exists():
        print(f"Loading CPI cleaned reference from {cpi_cleaned} and calculating metrics")
        df_cpi = pd.read_csv(cpi_cleaned)
        try:
            df_cpi = calculate_metrics.add_cpi_metrics(df_cpi)
        except Exception:
            print("Failed to compute CPI metrics from cleaned CSV; skipping real wage calc.")
            df_cpi = None
    else:
        print("CPI cleaned CSV not found; real wage growth will be skipped until CPI data is available.")

    if df_cpi is not None and not df_cpi.empty:
        df_wri = calculate_metrics.add_real_wage(df_wri, df_cpi)

    # Calculate WRI metrics (QoQ, YoY, moving average)
    df_wri_metrics = calculate_metrics.add_wri_metrics(df_wri)

    out_dir = DEFAULT_OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    cleaned_path = out_dir / 'wri_cleaned.csv'
    print(f"Saving cleaned WRI to {cleaned_path}")
    df_wri.to_csv(cleaned_path, index=False)

    metrics_path = out_dir / 'wri_metrics.csv'
    print(f"Saving WRI metrics to {metrics_path}")
    df_wri_metrics.to_csv(metrics_path, index=False)

    # Optionally load into DB
    if do_db:
        print("Loading WRI into database...")
        res = load_wri(df_wri)
        print(f"DB load result: {res}")

    print(f"WRI processing complete: {len(df_wri)} rows")
    return df_wri


def main():
    p = argparse.ArgumentParser()
    p.add_argument('excel', help='Path to WRI Excel file')
    p.add_argument('--db', action='store_true', help='Load cleaned data into DB')
    args = p.parse_args()
    run(args.excel, do_db=args.db)


if __name__ == '__main__':
    main()
