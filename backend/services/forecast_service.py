"""
Forecast Service: Handles Day-Ahead forecast resolution, revision trajectories,
and operational comparisons for energy trading.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from backend.database import get_db_connection

def resolve_cutoff_time(delivery_date_str: str, cutoff_time_str: str = "11:00") -> str:
    """
    Computes the cutoff datetime string (ISO format UTC) on Day D-1.
    e.g. delivery_date='2026-01-15', cutoff_time='11:00' -> '2026-01-14T11:00:00Z'
    """
    delivery_dt = datetime.strptime(delivery_date_str, "%Y-%m-%d")
    decision_dt = delivery_dt - timedelta(days=1)
    hh, mm = map(int, cutoff_time_str.split(":"))
    cutoff_dt = decision_dt.replace(hour=hh, minute=mm, second=0)
    return cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def get_day_ahead_schedule(
    delivery_date: str,
    cutoff_time: str = "11:00",
    custom_cutoff_iso: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetches the day-ahead view for a specific delivery date:
    - Latest forecast available before cutoff time
    - Actual generation outturn
    - Error metrics for the day
    - Intraday / latest forecast comparison
    """
    if custom_cutoff_iso:
        cutoff_iso = custom_cutoff_iso
    else:
        cutoff_iso = resolve_cutoff_time(delivery_date, cutoff_time)
        
    delivery_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
    decision_date = (delivery_dt - timedelta(days=1)).strftime("%Y-%m-%d")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Fetch Day-Ahead actionable forecast (published <= cutoff) vs Actuals
    query = """
    WITH ranked_da AS (
        SELECT start_time, publish_time, generation,
               ROW_NUMBER() OVER (PARTITION BY start_time ORDER BY publish_time DESC) as rn
        FROM forecast_generation
        WHERE publish_time <= ?
    ),
    ranked_latest AS (
        SELECT start_time, publish_time, generation,
               ROW_NUMBER() OVER (PARTITION BY start_time ORDER BY publish_time DESC) as rn
        FROM forecast_generation
        WHERE publish_time <= start_time
    )
    SELECT 
        a.settlement_date,
        a.settlement_period,
        a.start_time,
        a.generation as actual_generation,
        da.publish_time as da_publish_time,
        da.generation as da_forecast_generation,
        lt.publish_time as latest_publish_time,
        lt.generation as latest_forecast_generation
    FROM actual_generation a
    LEFT JOIN ranked_da da ON da.start_time = (substr(a.start_time, 1, 14) || '00:00Z') AND da.rn = 1
    LEFT JOIN ranked_latest lt ON lt.start_time = (substr(a.start_time, 1, 14) || '00:00Z') AND lt.rn = 1
    WHERE a.settlement_date = ?
    ORDER BY a.settlement_period ASC
    """
    
    cur.execute(query, (cutoff_iso, delivery_date))
    rows = cur.fetchall()
    
    periods = []
    total_actual = 0.0
    total_forecast = 0.0
    abs_errors = []
    errors = []
    
    for r in rows:
        act = r["actual_generation"]
        fc = r["da_forecast_generation"]
        lt_fc = r["latest_forecast_generation"]
        
        err = (fc - act) if (fc is not None and act is not None) else None
        abs_err = abs(err) if err is not None else None
        pct_err = round((err / act * 100), 2) if (err is not None and act and act > 10) else None
        
        if act is not None:
            total_actual += act
        if fc is not None:
            total_forecast += fc
        if abs_err is not None:
            abs_errors.append(abs_err)
            errors.append(err)
            
        periods.append({
            "settlementDate": r["settlement_date"],
            "settlementPeriod": r["settlement_period"],
            "startTime": r["start_time"],
            "actual": act,
            "dayAheadForecast": fc,
            "daPublishTime": r["da_publish_time"],
            "latestForecast": lt_fc,
            "latestPublishTime": r["latest_publish_time"],
            "error": round(err, 1) if err is not None else None,
            "absError": round(abs_err, 1) if abs_err is not None else None,
            "pctError": pct_err
        })
        
    # Calculate Day Summary KPI
    mae = round(sum(abs_errors) / len(abs_errors), 1) if abs_errors else None
    rmse = round((sum(e ** 2 for e in errors) / len(errors)) ** 0.5, 1) if errors else None
    bias = round(sum(errors) / len(errors), 1) if errors else None
    wape = round(sum(abs_errors) / total_actual * 100, 2) if total_actual > 0 and abs_errors else None
    
    # 2. Fetch Forecast Evolution runs for this delivery day
    # Retrieve all distinct forecast runs that contain forecasts for this delivery date
    start_bound = f"{delivery_date}T00:00:00Z"
    end_bound = f"{delivery_date}T23:30:00Z"
    
    cur.execute("""
    SELECT DISTINCT publish_time
    FROM forecast_generation
    WHERE start_time BETWEEN ? AND ?
    ORDER BY publish_time ASC
    """, (start_bound, end_bound))
    
    avail_runs = [x["publish_time"] for x in cur.fetchall()]
    
    conn.close()
    
    return {
        "deliveryDate": delivery_date,
        "decisionDate": decision_date,
        "cutoffTime": cutoff_time,
        "cutoffIso": cutoff_iso,
        "periods": periods,
        "summary": {
            "totalActualMWh": round(total_actual * 0.5, 1), # half-hourly MW to MWh
            "totalForecastMWh": round(total_forecast * 0.5, 1),
            "maeMW": mae,
            "rmseMW": rmse,
            "biasMW": bias,
            "wapePercent": wape,
            "periodsCount": len(periods),
            "overForecastPeriods": sum(1 for e in errors if e > 50),
            "underForecastPeriods": sum(1 for e in errors if e < -50),
            "direction": "OVER_FORECAST" if (bias and bias > 50) else ("UNDER_FORECAST" if (bias and bias < -50) else "BALANCED")
        },
        "availableForecastRuns": avail_runs
    }

def get_forecast_evolution(delivery_date: str) -> Dict[str, Any]:
    """
    Fetches all forecast runs published for the given delivery date,
    enabling visual comparison of how forecasts revised over time.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    start_bound = f"{delivery_date}T00:00:00Z"
    end_bound = f"{delivery_date}T23:30:00Z"
    
    cur.execute("""
    SELECT publish_time, start_time, generation
    FROM forecast_generation
    WHERE start_time BETWEEN ? AND ?
    ORDER BY publish_time ASC, start_time ASC
    """, (start_bound, end_bound))
    
    rows = cur.fetchall()
    
    runs = {}
    for r in rows:
        pt = r["publish_time"]
        if pt not in runs:
            runs[pt] = {}
        runs[pt][r["start_time"]] = r["generation"]
        
    # Also fetch actuals
    cur.execute("""
    SELECT start_time, generation
    FROM actual_generation
    WHERE settlement_date = ?
    ORDER BY settlement_period ASC
    """, (delivery_date,))
    
    actuals = {r["start_time"]: r["generation"] for r in cur.fetchall()}
    conn.close()
    
    return {
        "deliveryDate": delivery_date,
        "actuals": actuals,
        "runs": runs
    }
