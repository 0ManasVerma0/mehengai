from __future__ import annotations

from typing import Iterable
import math
from psycopg2.extras import execute_values
from .connection import get_connection


def _chunked_iterable(iterable: Iterable, size: int):
    it = iter(iterable)
    while True:
        chunk = []
        try:
            for _ in range(size):
                chunk.append(next(it))
        except StopIteration:
            if chunk:
                yield chunk
            break
        yield chunk


def bulk_upsert_cpi(rows: list[tuple], chunk_size: int = 1000) -> dict:
    """Bulk upsert CPI rows into `cpi_data` using execute_values.

    `rows` should be an iterable of tuples matching the target columns:
      (category, segment, state, month, year, value, mom_change, yoy_change, moving_avg)

    Returns a simple summary dict.
    """
    if not rows:
        return {"inserted": 0, "upserted_chunks": 0}

    conn = get_connection()
    cur = conn.cursor()
    sql = """
    INSERT INTO cpi_data (category, segment, state, month, year, value, mom_change, yoy_change, moving_avg)
    VALUES %s
    ON CONFLICT (category,segment,state,month,year)
    DO UPDATE SET value = EXCLUDED.value,
                  mom_change = EXCLUDED.mom_change,
                  yoy_change = EXCLUDED.yoy_change,
                  moving_avg = EXCLUDED.moving_avg
    """

    total = 0
    chunks = 0
    try:
        for chunk in _chunked_iterable(rows, chunk_size):
            execute_values(cur, sql, chunk, page_size=chunk_size)
            conn.commit()
            total += len(chunk)
            chunks += 1
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    return {"upserted": total, "upserted_chunks": chunks}


__all__ = ["bulk_upsert_cpi"]
