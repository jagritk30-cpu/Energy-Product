"""
Analytics Service: Computes rigorous quantitative metrics for wind generation forecasts.
Includes MAE, RMSE, MBE, WAPE, quantile distributions, forecast horizon degradation,
settlement period profiles, and calendar day performance.
"""
import math
from typing import Dict, List, Any, Optional
from datetime import datetime
from backend.database import get_db_connection

def calculate_quantiles(values: List[float], quantiles: List[float]) -> Dict[str, float]:
    if not values:
        return {f"P{int(q*100)}": 0.0 for q in quantiles}
    sorted_v = sorted(values)
    n = len(sorted_v)
    res = {}
    for q in quantiles:
        idx = int(q * (n - 1))
        res[f"P{int(q*100)}"] = round(sorted_v[idx], 1)
    return res

def get_overall_metrics(
    start_date: str = "2026-01-01",
    end_date: str = "2026-01-31",
    cutoff_time: str = "11:00"
) -> Dict[str, Any]:
    """
    Evaluates Day-Ahead forecast accuracy for each settlement period in the date range.
    Uses the latest forecast published before `cutoff_time` on Day D-1 for delivery day D.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    # SQLite query joining actuals with day-ahead forecast published before D-1 cutoff
    query = """
    WITH date_list AS (
        SELECT DISTINCT settlement_date 
        FROM actual_generation 
        WHERE settlement_date BETWEEN ? AND ?
    ),
    day_ahead_cutoffs AS (
        SELECT 
            settlement_date,
            strftime('%Y-%m-%dT', date(settlement_date, '-1 day')) || ? || ':00Z' as cutoff_iso
        FROM date_list
    ),
    ranked_da AS (
        SELECT 
            f.start_time,
            f.publish_time,
            f.generation,
            c.settlement_date,
            ROW_NUMBER() OVER (PARTITION BY f.start_time ORDER BY f.publish_time DESC) as rn
        FROM forecast_generation f
        JOIN day_ahead_cutoffs c ON date(f.start_time) = c.settlement_date
        WHERE f.publish_time <= c.cutoff_iso
    )
    SELECT 
        a.settlement_date,
        a.settlement_period,
        a.start_time,
        a.generation as actual,
        rf.generation as forecast,
        rf.publish_time as forecast_publish_time
    FROM actual_generation a
    LEFT JOIN ranked_da rf ON rf.start_time = (substr(a.start_time, 1, 14) || '00:00Z') AND rf.rn = 1
    WHERE a.settlement_date BETWEEN ? AND ?
    ORDER BY a.settlement_date ASC, a.settlement_period ASC
    """
    
    cur.execute(query, (start_date, end_date, cutoff_time, start_date, end_date))
    rows = cur.fetchall()
    conn.close()
    
    actuals = []
    forecasts = []
    errors = []         # Forecast - Actual
    abs_errors = []     # |Forecast - Actual|
    sq_errors = []      # (Forecast - Actual)^2
    
    over_count = 0
    under_count = 0
    balanced_count = 0
    
    daily_stats = {}
    
    for r in rows:
        act = r["actual"]
        fc = r["forecast"]
        if act is None or fc is None:
            continue
            
        err = fc - act
        abs_err = abs(err)
        
        actuals.append(act)
        forecasts.append(fc)
        errors.append(err)
        abs_errors.append(abs_err)
        sq_errors.append(err ** 2)
        
        if err > 100:
            over_count += 1
        elif err < -100:
            under_count += 1
        else:
            balanced_count += 1
            
        # Daily aggregation
        sdate = r["settlement_date"]
        if sdate not in daily_stats:
            daily_stats[sdate] = {"actuals": [], "forecasts": [], "errors": [], "abs_errors": []}
        daily_stats[sdate]["actuals"].append(act)
        daily_stats[sdate]["forecasts"].append(fc)
        daily_stats[sdate]["errors"].append(err)
        daily_stats[sdate]["abs_errors"].append(abs_err)
        
    n = len(actuals)
    if n == 0:
        return {"error": "No matching data found for date range"}
        
    total_actual_mwh = sum(actuals) * 0.5
    total_forecast_mwh = sum(forecasts) * 0.5
    mean_actual = sum(actuals) / n
    mean_forecast = sum(forecasts) / n
    max_actual = max(actuals)
    min_actual = min(actuals)
    
    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)
    mbe = sum(errors) / n # Mean Bias Error
    wape = (sum(abs_errors) / sum(actuals)) * 100 if sum(actuals) > 0 else 0.0
    
    # Normalized MAE relative to observed peak wind capacity (~22,000 MW in GB)
    nmae_capacity = (mae / 22000.0) * 100
    nmae_mean = (mae / mean_actual) * 100 if mean_actual > 0 else 0.0
    
    # Error quantiles
    quantiles_err = calculate_quantiles(errors, [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95])
    quantiles_abs = calculate_quantiles(abs_errors, [0.50, 0.75, 0.90, 0.95])
    
    # Daily breakdown for calendar heatmap
    calendar_days = []
    for sdate, ddata in sorted(daily_stats.items()):
        d_n = len(ddata["actuals"])
        d_act_sum = sum(ddata["actuals"])
        d_mae = sum(ddata["abs_errors"]) / d_n if d_n else 0
        d_mbe = sum(ddata["errors"]) / d_n if d_n else 0
        d_wape = (sum(ddata["abs_errors"]) / d_act_sum) * 100 if d_act_sum > 0 else 0
        
        status = "EXCELLENT" if d_wape < 10 else ("GOOD" if d_wape < 20 else ("MODERATE" if d_wape < 30 else "CHALLENGING"))
        
        calendar_days.append({
            "date": sdate,
            "actualGWh": round(d_act_sum * 0.5 / 1000, 2),
            "forecastGWh": round(sum(ddata["forecasts"]) * 0.5 / 1000, 2),
            "maeMW": round(d_mae, 1),
            "biasMW": round(d_mbe, 1),
            "wapePercent": round(d_wape, 2),
            "status": status,
            "peakActualMW": round(max(ddata["actuals"]), 1),
            "peakForecastMW": round(max(ddata["forecasts"]), 1)
        })
        
    return {
        "summary": {
            "evaluationPeriod": f"{start_date} to {end_date}",
            "cutoffTime": cutoff_time,
            "totalSettlementPeriods": n,
            "totalDays": len(daily_stats),
            "totalActualGWh": round(total_actual_mwh / 1000, 1),
            "totalForecastGWh": round(total_forecast_mwh / 1000, 1),
            "meanActualMW": round(mean_actual, 1),
            "meanForecastMW": round(mean_forecast, 1),
            "maxActualMW": round(max_actual, 1),
            "minActualMW": round(min_actual, 1),
            "maeMW": round(mae, 1),
            "rmseMW": round(rmse, 1),
            "mbeMW": round(mbe, 1),
            "wapePercent": round(wape, 2),
            "nmaeCapacityPercent": round(nmae_capacity, 2),
            "nmaeMeanPercent": round(nmae_mean, 2),
            "biasDirection": "OVER_FORECAST" if mbe > 50 else ("UNDER_FORECAST" if mbe < -50 else "NEUTRAL"),
            "overForecastShare": round((over_count / n) * 100, 1),
            "underForecastShare": round((under_count / n) * 100, 1),
            "balancedShare": round((balanced_count / n) * 100, 1)
        },
        "quantilesError": quantiles_err,
        "quantilesAbsError": quantiles_abs,
        "calendarDays": calendar_days
    }

def get_forecast_horizon_analysis(start_date: str = "2026-01-01", end_date: str = "2026-01-31") -> List[Dict[str, Any]]:
    """
    Analyzes error degradation as lead time increases.
    Computes lead time in hours = (startTime - publishTime).
    Groups into standard energy trading horizons:
    - 0-6 hours (Intraday Real-time)
    - 6-12 hours (Intraday Half-Day)
    - 12-24 hours (Day-Ahead Early)
    - 24-36 hours (Day-Ahead Standard Auction)
    - 36-48 hours (Day-Ahead Long)
    - 48-72 hours (Two-Day Ahead)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
    SELECT 
        f.publish_time,
        f.start_time,
        f.generation as forecast_gen,
        a.generation as actual_gen,
        ((julianday(f.start_time) - julianday(f.publish_time)) * 24.0) as lead_hours
    FROM forecast_generation f
    JOIN actual_generation a ON f.start_time = (substr(a.start_time, 1, 14) || '00:00Z')
    WHERE a.settlement_date BETWEEN ? AND ?
      AND lead_hours >= 0 AND lead_hours <= 72
    """
    
    cur.execute(query, (start_date, end_date))
    rows = cur.fetchall()
    conn.close()
    
    buckets = {
        "0-6h (Intraday RT)": {"min": 0, "max": 6, "errors": [], "abs_errors": [], "sq_errors": [], "actuals": []},
        "6-12h (Intraday Mid)": {"min": 6, "max": 12, "errors": [], "abs_errors": [], "sq_errors": [], "actuals": []},
        "12-24h (DA Gate Closure)": {"min": 12, "max": 24, "errors": [], "abs_errors": [], "sq_errors": [], "actuals": []},
        "24-36h (DA Auction Window)": {"min": 24, "max": 36, "errors": [], "abs_errors": [], "sq_errors": [], "actuals": []},
        "36-48h (DA Extended)": {"min": 36, "max": 48, "errors": [], "abs_errors": [], "sq_errors": [], "actuals": []},
        "48-72h (Two-Day Ahead)": {"min": 48, "max": 72, "errors": [], "abs_errors": [], "sq_errors": [], "actuals": []},
    }
    
    for r in rows:
        lead = r["lead_hours"]
        act = r["actual_gen"]
        fc = r["forecast_gen"]
        if act is None or fc is None:
            continue
            
        err = fc - act
        abs_err = abs(err)
        sq_err = err ** 2
        
        for name, b in buckets.items():
            if b["min"] <= lead < b["max"]:
                b["errors"].append(err)
                b["abs_errors"].append(abs_err)
                b["sq_errors"].append(sq_err)
                b["actuals"].append(act)
                break
                
    result = []
    for name, b in buckets.items():
        n = len(b["errors"])
        if n == 0:
            continue
        mae = sum(b["abs_errors"]) / n
        rmse = math.sqrt(sum(b["sq_errors"]) / n)
        mbe = sum(b["errors"]) / n
        tot_act = sum(b["actuals"])
        wape = (sum(b["abs_errors"]) / tot_act * 100) if tot_act > 0 else 0
        
        result.append({
            "horizon": name,
            "sampleCount": n,
            "maeMW": round(mae, 1),
            "rmseMW": round(rmse, 1),
            "biasMW": round(mbe, 1),
            "wapePercent": round(wape, 2)
        })
        
    return result

def get_settlement_period_profile(start_date: str = "2026-01-01", end_date: str = "2026-01-31", cutoff_time: str = "11:00") -> List[Dict[str, Any]]:
    """
    Computes diurnal error and generation profile across all 48 settlement periods.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
    WITH date_list AS (
        SELECT DISTINCT settlement_date 
        FROM actual_generation 
        WHERE settlement_date BETWEEN ? AND ?
    ),
    day_ahead_cutoffs AS (
        SELECT 
            settlement_date,
            strftime('%Y-%m-%dT', date(settlement_date, '-1 day')) || ? || ':00Z' as cutoff_iso
        FROM date_list
    ),
    ranked_da AS (
        SELECT 
            f.start_time,
            f.generation,
            c.settlement_date,
            ROW_NUMBER() OVER (PARTITION BY f.start_time ORDER BY f.publish_time DESC) as rn
        FROM forecast_generation f
        JOIN day_ahead_cutoffs c ON date(f.start_time) = c.settlement_date
        WHERE f.publish_time <= c.cutoff_iso
    )
    SELECT 
        a.settlement_period,
        AVG(a.generation) as avg_actual,
        AVG(rf.generation) as avg_forecast,
        AVG(rf.generation - a.generation) as avg_bias,
        AVG(ABS(rf.generation - a.generation)) as avg_mae
    FROM actual_generation a
    LEFT JOIN ranked_da rf ON rf.start_time = (substr(a.start_time, 1, 14) || '00:00Z') AND rf.rn = 1
    WHERE a.settlement_date BETWEEN ? AND ?
    GROUP BY a.settlement_period
    ORDER BY a.settlement_period ASC
    """
    
    cur.execute(query, (start_date, end_date, cutoff_time, start_date, end_date))
    rows = cur.fetchall()
    conn.close()
    
    profile = []
    for r in rows:
        sp = r["settlement_period"]
        # Convert SP to time string: SP 1 is 00:00, SP 48 is 23:30
        mins = (sp - 1) * 30
        hh = mins // 60
        mm = mins % 60
        time_str = f"{hh:02d}:{mm:02d}"
        is_peak = (14 <= sp <= 38) # approx 06:30 to 19:00
        
        profile.append({
            "settlementPeriod": sp,
            "time": time_str,
            "isPeak": is_peak,
            "avgActualMW": round(r["avg_actual"] or 0, 1),
            "avgForecastMW": round(r["avg_forecast"] or 0, 1),
            "biasMW": round(r["avg_bias"] or 0, 1),
            "maeMW": round(r["avg_mae"] or 0, 1)
        })
        
    return profile

def get_error_distribution(start_date: str = "2026-01-01", end_date: str = "2026-01-31", cutoff_time: str = "11:00") -> Dict[str, Any]:
    """
    Computes histogram distribution of forecast errors (Forecast - Actual)
    with fixed bin widths (e.g. 500 MW), plus shortfall probabilities.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
    WITH date_list AS (
        SELECT DISTINCT settlement_date 
        FROM actual_generation 
        WHERE settlement_date BETWEEN ? AND ?
    ),
    day_ahead_cutoffs AS (
        SELECT 
            settlement_date,
            strftime('%Y-%m-%dT', date(settlement_date, '-1 day')) || ? || ':00Z' as cutoff_iso
        FROM date_list
    ),
    ranked_da AS (
        SELECT 
            f.start_time,
            f.generation,
            c.settlement_date,
            ROW_NUMBER() OVER (PARTITION BY f.start_time ORDER BY f.publish_time DESC) as rn
        FROM forecast_generation f
        JOIN day_ahead_cutoffs c ON date(f.start_time) = c.settlement_date
        WHERE f.publish_time <= c.cutoff_iso
    )
    SELECT (rf.generation - a.generation) as error
    FROM actual_generation a
    JOIN ranked_da rf ON rf.start_time = (substr(a.start_time, 1, 14) || '00:00Z') AND rf.rn = 1
    WHERE a.settlement_date BETWEEN ? AND ? AND rf.generation IS NOT NULL
    """
    
    cur.execute(query, (start_date, end_date, cutoff_time, start_date, end_date))
    rows = cur.fetchall()
    conn.close()
    
    errors = [r["error"] for r in rows if r["error"] is not None]
    if not errors:
        return {"bins": [], "probabilities": {}}
        
    bin_width = 500
    min_bin = math.floor(min(errors) / bin_width) * bin_width
    max_bin = math.ceil(max(errors) / bin_width) * bin_width
    
    bins = {}
    current = min_bin
    while current <= max_bin:
        bins[current] = 0
        current += bin_width
        
    for e in errors:
        b = math.floor(e / bin_width) * bin_width
        if b in bins:
            bins[b] += 1
            
    total = len(errors)
    bin_list = [
        {
            "binStart": k,
            "binEnd": k + bin_width,
            "label": f"{k} to {k + bin_width} MW",
            "count": v,
            "percentage": round((v / total) * 100, 2)
        }
        for k, v in sorted(bins.items())
    ]
    
    # Risk probabilities:
    # Shortfall: Wind was LOWER than forecast by > 1000MW, > 2000MW (Error > 1000, > 2000)
    p_shortfall_1000 = round(sum(1 for e in errors if e > 1000) / total * 100, 1)
    p_shortfall_2000 = round(sum(1 for e in errors if e > 2000) / total * 100, 1)
    p_excess_1000 = round(sum(1 for e in errors if e < -1000) / total * 100, 1)
    p_excess_2000 = round(sum(1 for e in errors if e < -2000) / total * 100, 1)
    
    return {
        "binWidth": bin_width,
        "totalSamples": total,
        "bins": bin_list,
        "riskShortfall": {
            "shortfallOver1000MWPct": p_shortfall_1000,
            "shortfallOver2000MWPct": p_shortfall_2000,
            "surplusOver1000MWPct": p_excess_1000,
            "surplusOver2000MWPct": p_excess_2000,
        }
    }
