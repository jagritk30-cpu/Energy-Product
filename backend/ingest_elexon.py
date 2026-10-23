"""
Elexon BMRS Data Ingestion Script for January 2026
Datasets:
- FUELHH: Half-hourly actual generation by fuel type (we filter fuelType == 'WIND')
- WINDFOR: Wind power generation forecasts with publishTime and startTime
"""

import sys
import os
import sqlite3
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "elexon_jan2026.db")

def init_db(db_path=DB_PATH):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Table for actual generation (FUELHH - WIND)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS actual_generation (
        start_time TEXT PRIMARY KEY,
        publish_time TEXT,
        settlement_date TEXT,
        settlement_period INTEGER,
        fuel_type TEXT,
        generation REAL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_date ON actual_generation(settlement_date);")
    
    # Table for forecasted generation (WINDFOR)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecast_generation (
        publish_time TEXT,
        start_time TEXT,
        generation REAL,
        PRIMARY KEY (publish_time, start_time)
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start ON forecast_generation(start_time);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_publish ON forecast_generation(publish_time);")
    
    conn.commit()
    conn.close()

def fetch_json(url, retries=3, delay=2):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "UK-Energy-Utility-Analysis/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read().decode("utf-8")
                return json.loads(data)
        except Exception as e:
            print(f"Error fetching {url} (attempt {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
            else:
                raise

def ingest_fuelhh(start_dt, end_dt, conn):
    """
    Fetch FUELHH stream data in 2-day chunks.
    Filters fuelType == 'WIND'.
    """
    print(f"--- Fetching FUELHH (Actuals) from {start_dt} to {end_dt} ---")
    cursor = conn.cursor()
    cur = start_dt
    total_wind = 0
    
    while cur < end_dt:
        chunk_end = min(cur + timedelta(days=2), end_dt)
        dt_from = cur.strftime("%Y-%m-%dT%H:%M:%SZ")
        dt_to = chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom={dt_from}&publishDateTimeTo={dt_to}"
        
        try:
            items = fetch_json(url)
            wind_items = [x for x in items if x.get("fuelType") == "WIND"]
            for item in wind_items:
                cursor.execute("""
                INSERT OR REPLACE INTO actual_generation 
                (start_time, publish_time, settlement_date, settlement_period, fuel_type, generation)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    item.get("startTime"),
                    item.get("publishTime"),
                    item.get("settlementDate"),
                    item.get("settlementPeriod"),
                    item.get("fuelType"),
                    float(item.get("generation", 0))
                ))
            conn.commit()
            total_wind += len(wind_items)
            print(f"  FUELHH chunk {dt_from} to {dt_to}: {len(wind_items)} wind records (Total so far: {total_wind})")
        except Exception as e:
            print(f"  Failed FUELHH chunk {dt_from} to {dt_to}: {e}")
            
        cur = chunk_end
        time.sleep(0.2)
        
    print(f"Completed FUELHH ingestion: {total_wind} total WIND records.")
    return total_wind

def ingest_windfor(start_dt, end_dt, conn):
    """
    Fetch WINDFOR stream data in 1-day chunks.
    """
    print(f"--- Fetching WINDFOR (Forecasts) from {start_dt} to {end_dt} ---")
    cursor = conn.cursor()
    cur = start_dt
    total_forecasts = 0
    
    while cur < end_dt:
        chunk_end = min(cur + timedelta(days=1), end_dt)
        dt_from = cur.strftime("%Y-%m-%dT%H:%M:%SZ")
        dt_to = chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom={dt_from}&publishDateTimeTo={dt_to}"
        
        try:
            items = fetch_json(url)
            batch = []
            for item in items:
                pt = item.get("publishTime")
                st = item.get("startTime")
                gen = item.get("generation")
                if pt and st and gen is not None:
                    batch.append((pt, st, float(gen)))
                    
            cursor.executemany("""
            INSERT OR REPLACE INTO forecast_generation (publish_time, start_time, generation)
            VALUES (?, ?, ?)
            """, batch)
            conn.commit()
            total_forecasts += len(batch)
            print(f"  WINDFOR chunk {dt_from} to {dt_to}: {len(batch)} records (Total so far: {total_forecasts})")
        except Exception as e:
            print(f"  Failed WINDFOR chunk {dt_from} to {dt_to}: {e}")
            
        cur = chunk_end
        time.sleep(0.3)
        
    print(f"Completed WINDFOR ingestion: {total_forecasts} total forecast records.")
    return total_forecasts

def run():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    
    # We want data covering decisions made in January 2026.
    # Start: 2025-12-30T00:00:00Z (covers forecasts published on D-1 for 2026-01-01)
    # End: 2026-02-02T00:00:00Z (covers delivery up through 2026-02-01 resulting from 2026-01-31 decisions)
    start_dt = datetime(2025, 12, 30, 0, 0, 0)
    end_dt = datetime(2026, 2, 2, 0, 0, 0)
    
    print(f"Starting Elexon BMRS data ingestion into: {DB_PATH}")
    ingest_fuelhh(start_dt, end_dt, conn)
    ingest_windfor(start_dt, end_dt, conn)
    
    # Check counts
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), MIN(start_time), MAX(start_time) FROM actual_generation")
    act_count, act_min, act_max = cursor.fetchone()
    print(f"Actuals count: {act_count}, range: {act_min} -> {act_max}")
    
    cursor.execute("SELECT COUNT(*), MIN(publish_time), MAX(publish_time) FROM forecast_generation")
    fc_count, fc_min, fc_max = cursor.fetchone()
    print(f"Forecasts count: {fc_count}, publish range: {fc_min} -> {fc_max}")
    
    conn.close()

if __name__ == "__main__":
    run()
