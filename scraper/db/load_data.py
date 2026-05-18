import pandas as pd
from db.connection import get_connection
import logging
from psycopg2.extras import execute_values

logger = logging.getLogger(__name__)


def _f(val):
    """Safe float conversion — returns None for NaN/None."""
    try:
        if val is None or (
            isinstance(val, float) and pd.isna(val)
        ):
            return None
        return float(val)
    except (TypeError, ValueError):
        return None


def load_cpi(df: pd.DataFrame) -> dict:
    conn           = get_connection()
    cur            = conn.cursor()
    ins, skip, err = 0, 0, 0

    print(f"  Loading {len(df)} CPI rows into Supabase...")

    for _, row in df.iterrows():
        try:
            cur.execute("""
                INSERT INTO cpi_data
                  (category, segment, state, month, year,
                   value, mom_change, yoy_change, moving_avg)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (category,segment,state,month,year)
                DO NOTHING
            """, (
                row['category'],
                row['segment'],
                row.get('state', 'National'),
                int(row['month']),
                int(row['year']),
                _f(row['value']),
                _f(row.get('mom_change')),
                _f(row.get('yoy_change')),
                _f(row.get('moving_avg')),
            ))
            if cur.rowcount > 0:
                ins  += 1
            else:
                skip += 1
        except Exception as e:
            err += 1
            conn.rollback()
            logger.error(f"CPI insert error: {e}")

    conn.commit()
    cur.close()
    conn.close()

    result = {'inserted': ins, 'skipped': skip, 'errors': err}
    print(f"  CPI load: {result}")
    return result


def load_wri(df: pd.DataFrame) -> dict:
    if df is None or df.empty:
        print("  No WRI data to load")
        return {}

    conn      = get_connection()
    cur       = conn.cursor()
    upserted, errors = 0, 0

    print(f"  Loading {len(df)} WRI rows into Supabase (upsert)...")

    # Ensure metric columns exist
    try:
        cur.execute("""
            ALTER TABLE wri_data
            ADD COLUMN IF NOT EXISTS qoq_change numeric,
            ADD COLUMN IF NOT EXISTS yoy_change numeric,
            ADD COLUMN IF NOT EXISTS moving_avg_4q numeric
        """)
        conn.commit()
    except Exception:
        conn.rollback()

    sql = """
        INSERT INTO wri_data
          (sector, year, quarter,
           wri_value, real_wage_growth, status,
           qoq_change, yoy_change, moving_avg_4q)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (sector,year,quarter)
        DO UPDATE SET
          wri_value = EXCLUDED.wri_value,
          real_wage_growth = EXCLUDED.real_wage_growth,
          status = EXCLUDED.status,
          qoq_change = EXCLUDED.qoq_change,
          yoy_change = EXCLUDED.yoy_change,
          moving_avg_4q = EXCLUDED.moving_avg_4q
    """

    for _, row in df.iterrows():
        try:
            raw_status = row.get('status')
            if raw_status is None or (isinstance(raw_status, float) and pd.isna(raw_status)) or str(raw_status).strip() == '':
                status_val = 'neutral'
            else:
                status_val = str(raw_status).strip()
            cur.execute(sql, (
                row.get('sector'),
                int(row['year']) if pd.notna(row.get('year')) else None,
                int(row['quarter']) if pd.notna(row.get('quarter')) else None,
                _f(row.get('wri_value')),
                _f(row.get('real_wage_growth')),
                status_val,
                _f(row.get('qoq_change')),
                _f(row.get('yoy_change')),
                _f(row.get('moving_avg_4q')),
            ))
            # rowcount > 0 indicates insert or update happened
            if cur.rowcount and cur.rowcount > 0:
                upserted += 1
        except Exception as e:
            errors += 1
            conn.rollback()
            logger.error(f"WRI insert error: {e}")

    conn.commit()
    cur.close()
    conn.close()

    result = {'upserted': upserted, 'errors': errors}
    print(f"  WRI load: {result}")
    return result


def load_prices(df: pd.DataFrame) -> dict:
    if df is None or df.empty:
        print("  No price data to load")
        return {}

    conn      = get_connection()
    cur       = conn.cursor()
    ins, skip = 0, 0

    print(f"  Loading {len(df)} price rows into Supabase...")

    rows = []
    for _, row in df.iterrows():
        rows.append((
            row['product'],
            row['city'],
            float(row['price']),
            row['recorded_at'],
        ))

    sql = """
        INSERT INTO price_tracker
          (product, city, price, recorded_at)
        VALUES %s
        ON CONFLICT (product,city,recorded_at)
        DO NOTHING
    """

    chunk_size = 1000
    try:
        for start in range(0, len(rows), chunk_size):
            chunk = rows[start:start + chunk_size]
            execute_values(cur, sql, chunk, page_size=chunk_size)
            conn.commit()
            inserted = cur.rowcount if cur.rowcount != -1 else len(chunk)
            ins += inserted
            skip += (len(chunk) - inserted)
            print(f"    loaded {min(start + chunk_size, len(rows))}/{len(rows)} rows")
    except Exception as e:
        conn.rollback()
        logger.error(f"Price load error: {e}")
        raise

    cur.close()
    conn.close()

    result = {'inserted': ins, 'skipped': skip}
    print(f"  Price load: {result}")
    return result


def verify():
    """Print row counts from each table to confirm data loaded."""
    conn = get_connection()
    cur  = conn.cursor()

    print("\n── Database Verification ────────────────────")
    queries = {
        "cpi_data": """
            SELECT COUNT(*) total, MIN(year) earliest,
                   MAX(year) latest,
                   COUNT(DISTINCT category) categories
            FROM cpi_data
        """,
        "wri_data": """
            SELECT COUNT(*) total,
                   MIN(year) earliest, MAX(year) latest
            FROM wri_data
        """,
        "price_tracker": """
            SELECT COUNT(*) total,
                   MIN(recorded_at) earliest,
                   MAX(recorded_at) latest
            FROM price_tracker
        """
    }

    for table, q in queries.items():
        cur.execute(q)
        row  = cur.fetchone()
        cols = [d[0] for d in cur.description]
        print(f"\n  {table}:")
        for col, val in zip(cols, row):
            print(f"    {col}: {val}")

    cur.close()
    conn.close()