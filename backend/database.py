"""
Database connection and schema utilities.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "elexon_jan2026.db")

def get_db_connection(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def is_db_populated(db_path=DB_PATH) -> bool:
    if not os.path.exists(db_path):
        return False
    try:
        conn = get_db_connection(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM actual_generation")
        act_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM forecast_generation")
        fc_count = cur.fetchone()[0]
        conn.close()
        return act_count > 1000 and fc_count > 5000
    except Exception:
        return False
