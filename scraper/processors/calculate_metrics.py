import pandas as pd
import logging

logger = logging.getLogger(__name__)


def add_cpi_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Add MoM, YoY (calculated), and 12M moving average to CPI."""
    df = df.copy()
    df = df.sort_values(
        ['category','segment','state','year','month']
    )

    mom_list, yoy_list, ma_list = [], [], []

    for _, group in df.groupby(['category','segment','state']):
        g = group.sort_values(['year','month'])
        mom_list.append(g['value'].pct_change() * 100)
        yoy_list.append(g['value'].pct_change(12) * 100)
        ma_list.append(
            g['value'].rolling(12, min_periods=6).mean()
        )

    df['mom_change']    = pd.concat(mom_list).round(2)
    df['yoy_calculated']= pd.concat(yoy_list).round(2)
    df['moving_avg']    = pd.concat(ma_list).round(2)

    # Use MOSPI's own YoY where available (more accurate)
    # Fall back to calculated where MOSPI didn't provide it
    if 'api_yoy' in df.columns:
        df['yoy_change'] = df['api_yoy'].combine_first(
            df['yoy_calculated']
        ).round(2)
        df = df.drop(columns=['api_yoy','yoy_calculated'])
    else:
        df['yoy_change'] = df['yoy_calculated'].round(2)
        df = df.drop(columns=['yoy_calculated'])

    # Replace NaN with None (PostgreSQL NULL)
    for col in ['mom_change','yoy_change','moving_avg']:
        df[col] = df[col].where(df[col].notna(), None)

    print(f"  CPI metrics calculated for {len(df)} rows")
    return df


def add_real_wage(df_wri: pd.DataFrame,
                  df_cpi: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate Real Wage Growth = WRI YoY - CPI YoY.

    Positive → wages growing faster than inflation (good)
    Negative → inflation eating into wages (bad)
    """
    if df_wri is None or df_wri.empty:
        return df_wri

    df_wri = df_wri.copy()

    # Get national General CPI YoY per month
    cpi_ref = df_cpi[
        (df_cpi['category'] == 'General') &
        (df_cpi['segment']  == 'combined') &
        (df_cpi['state']    == 'National')
    ][['month','year','yoy_change']].rename(
        columns={'yoy_change': 'cpi_yoy'}
    )

    # Map quarter → months for averaging CPI
    q_months = {
        1: [1,2,3],
        2: [4,5,6],
        3: [7,8,9],
        4: [10,11,12]
    }

    def get_quarter_cpi(year, quarter):
        months = q_months.get(int(quarter), [])
        subset = cpi_ref[
            (cpi_ref['year']  == year) &
            (cpi_ref['month'].isin(months))
        ]
        return subset['cpi_yoy'].mean() if not subset.empty else None

    df_wri['cpi_avg'] = df_wri.apply(
        lambda r: get_quarter_cpi(r['year'], r['quarter']),
        axis=1
    )

    # Use API YoY if available, else skip real wage calc
    if 'wri_yoy' in df_wri.columns:
        df_wri['real_wage_growth'] = (
            df_wri['wri_yoy'] - df_wri['cpi_avg']
        ).round(2)
    else:
        df_wri['real_wage_growth'] = None

    df_wri['status'] = df_wri['real_wage_growth'].apply(
        lambda x:
            'improving' if pd.notna(x) and x > 0.5
            else 'declining' if pd.notna(x) and x < -0.5
            else 'neutral'   if pd.notna(x)
            else None
    )

    df_wri = df_wri.drop(columns=['cpi_avg'], errors='ignore')

    print(f"  Real wage growth calculated for {len(df_wri)} WRI rows")
    return df_wri


def add_wpi_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Add MoM, YoY, and moving average to WPI price rows."""
    if df is None or df.empty:
        return df

    df = df.copy()
    sort_cols = [c for c in ["product", "city", "year", "month"] if c in df.columns]
    if sort_cols:
        df = df.sort_values(sort_cols)

    groups = [c for c in ["product", "city"] if c in df.columns]
    if not groups:
        groups = ["product"]

    mom_list, yoy_list, ma_list = [], [], []
    for _, group in df.groupby(groups):
        g = group.sort_values([c for c in ["year", "month"] if c in group.columns])
        mom_list.append(g["price"].pct_change() * 100)
        yoy_list.append(g["price"].pct_change(12) * 100)
        ma_list.append(g["price"].rolling(12, min_periods=6).mean())

    df["mom_change"] = pd.concat(mom_list).round(2)
    df["yoy_change"] = pd.concat(yoy_list).round(2)
    df["moving_avg"] = pd.concat(ma_list).round(2)

    for col in ["mom_change", "yoy_change", "moving_avg"]:
        df[col] = df[col].where(df[col].notna(), None)

    print(f"  WPI metrics calculated for {len(df)} rows")
    return df


def run(df_cpi: pd.DataFrame,
        df_wri: pd.DataFrame = None):
    """Master metrics function."""
    print("\n── Calculating Metrics ─────────────────────")
    df_cpi = add_cpi_metrics(df_cpi)
    if df_wri is not None and not df_wri.empty:
        df_wri = add_real_wage(df_wri, df_cpi)
    return df_cpi, df_wri