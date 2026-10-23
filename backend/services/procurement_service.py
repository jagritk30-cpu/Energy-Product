"""
Procurement Service: Calculates net thermal power procurement for the UK Day-Ahead market,
incorporating quantitative wind forecast error buffers to prevent expensive imbalance penalties.
"""
from typing import Dict, List, Any, Optional
from backend.services.forecast_service import get_day_ahead_schedule
from backend.services.analytics_service import get_overall_metrics

# Standard GB winter diurnal profile weights for 48 settlement periods (normalised around 1.0)
# Reflects morning ramp (07:00-09:00) and evening cooking/heating peak (17:00-20:00)
GB_WINTER_SHAPE = [
    0.68, 0.65, 0.63, 0.62, 0.61, 0.62, 0.64, 0.68,  # SP 1-8 (00:00 - 04:00)
    0.73, 0.81, 0.92, 1.05, 1.15, 1.18, 1.17, 1.15,  # SP 9-16 (04:00 - 08:00)
    1.14, 1.12, 1.11, 1.10, 1.09, 1.08, 1.07, 1.06,  # SP 17-24 (08:00 - 12:00)
    1.05, 1.04, 1.04, 1.05, 1.08, 1.12, 1.18, 1.25,  # SP 25-32 (12:00 - 16:00)
    1.32, 1.35, 1.33, 1.28, 1.22, 1.15, 1.08, 1.02,  # SP 33-40 (16:00 - 20:00)
    0.95, 0.88, 0.82, 0.77, 0.73, 0.70, 0.68, 0.66   # SP 41-48 (20:00 - 24:00)
]

def calculate_net_procurement(
    delivery_date: str,
    cutoff_time: str = "11:00",
    scale_mode: str = "national",  # 'national' or 'utility'
    peak_demand_mw: float = 38000.0, # 38,000 MW for national or ~2,500 MW for regional utility
    wind_share_pct: float = 100.0,   # % share of GB wind generation attributed to this utility
    risk_confidence: int = 90,       # 50, 80, 90, 95
    da_power_price_gbp: float = 85.0, # £/MWh day-ahead price
    cashout_imbalance_penalty_gbp: float = 145.0 # £/MWh penalty for under-procured short position
) -> Dict[str, Any]:
    """
    Computes half-hourly net procurement schedule:
    Consumer Demand - (Wind Forecast - Risk Buffer) = Thermal Procurement Needed
    """
    # 1. Fetch Day-Ahead forecast schedule
    schedule = get_day_ahead_schedule(delivery_date, cutoff_time)
    periods = schedule["periods"]
    
    # 2. Determine error buffer from historical January 2026 quantiles
    # For national wind, a 90% confidence buffer corresponds to ~90th percentile of positive forecast error (over-forecast)
    metrics = get_overall_metrics("2026-01-01", "2026-01-31", cutoff_time)
    p_err = metrics.get("quantilesError", {})
    
    # Positive error in (Forecast - Actual) means wind underperformed forecast.
    # Buffer in MW national:
    buffer_lookup = {
        50: max(0.0, p_err.get("P50", 0.0)),
        80: max(0.0, p_err.get("P75", 600.0)),
        90: max(0.0, p_err.get("P90", 1400.0)),
        95: max(0.0, p_err.get("P95", 2200.0)),
    }
    national_buffer_mw = buffer_lookup.get(risk_confidence, 1200.0)
    
    # Adjust for portfolio scale
    wind_ratio = (wind_share_pct / 100.0)
    effective_buffer_mw = national_buffer_mw * wind_ratio
    
    # Peak demand scaling
    max_weight = max(GB_WINTER_SHAPE)
    base_multiplier = peak_demand_mw / max_weight
    
    results = []
    tot_demand_mwh = 0.0
    tot_wind_fc_mwh = 0.0
    tot_wind_act_mwh = 0.0
    tot_raw_thermal_mwh = 0.0
    tot_buffered_thermal_mwh = 0.0
    tot_actual_thermal_needed_mwh = 0.0
    
    for idx, p in enumerate(periods):
        sp = p["settlementPeriod"]
        weight = GB_WINTER_SHAPE[min(idx, len(GB_WINTER_SHAPE) - 1)]
        demand = round(weight * base_multiplier, 1)
        
        raw_wind_fc = p["dayAheadForecast"] or 0.0
        wind_fc = round(raw_wind_fc * wind_ratio, 1)
        
        raw_wind_act = p["actual"] or 0.0
        wind_act = round(raw_wind_act * wind_ratio, 1)
        
        # Risk-buffered wind estimate
        buffered_wind = max(0.0, wind_fc - effective_buffer_mw)
        
        # Thermal purchase required
        thermal_raw = max(0.0, demand - wind_fc)
        thermal_buffered = max(0.0, demand - buffered_wind)
        thermal_actual_needed = max(0.0, demand - wind_act)
        
        # Energy MWh (each SP is 0.5 hours)
        tot_demand_mwh += demand * 0.5
        tot_wind_fc_mwh += wind_fc * 0.5
        tot_wind_act_mwh += wind_act * 0.5
        tot_raw_thermal_mwh += thermal_raw * 0.5
        tot_buffered_thermal_mwh += thermal_buffered * 0.5
        tot_actual_thermal_needed_mwh += thermal_actual_needed * 0.5
        
        # Imbalance under-delivery (shortfall) if raw vs buffered
        shortfall_raw = max(0.0, thermal_actual_needed - thermal_raw)
        shortfall_buffered = max(0.0, thermal_actual_needed - thermal_buffered)
        
        results.append({
            "settlementPeriod": sp,
            "startTime": p["startTime"],
            "demandMW": demand,
            "windForecastMW": wind_fc,
            "bufferedWindMW": round(buffered_wind, 1),
            "windActualMW": wind_act,
            "thermalRawDA_MW": round(thermal_raw, 1),
            "thermalBufferedDA_MW": round(thermal_buffered, 1),
            "thermalActualNeededMW": round(thermal_actual_needed, 1),
            "rawShortfallMW": round(shortfall_raw, 1),
            "bufferedShortfallMW": round(shortfall_buffered, 1)
        })
        
    # Financial impact estimate
    da_cost_raw = tot_raw_thermal_mwh * da_power_price_gbp
    da_cost_buffered = tot_buffered_thermal_mwh * da_power_price_gbp
    
    # Imbalance exposure avoided
    raw_shortfall_mwh = sum(r["rawShortfallMW"] * 0.5 for r in results)
    buffered_shortfall_mwh = sum(r["bufferedShortfallMW"] * 0.5 for r in results)
    shortfall_mwh_avoided = max(0.0, raw_shortfall_mwh - buffered_shortfall_mwh)
    
    # Financial penalty savings: imbalance price minus day-ahead price
    penalty_spread = max(0.0, cashout_imbalance_penalty_gbp - da_power_price_gbp)
    cashout_savings_gbp = shortfall_mwh_avoided * penalty_spread
    
    return {
        "deliveryDate": delivery_date,
        "parameters": {
            "scaleMode": scale_mode,
            "peakDemandMW": peak_demand_mw,
            "windSharePct": wind_share_pct,
            "riskConfidencePct": risk_confidence,
            "bufferMW": round(effective_buffer_mw, 1),
            "dayAheadPowerPriceGBP": da_power_price_gbp,
            "cashoutPenaltyPriceGBP": cashout_imbalance_penalty_gbp
        },
        "totals": {
            "demandMWh": round(tot_demand_mwh, 1),
            "windForecastMWh": round(tot_wind_fc_mwh, 1),
            "windActualMWh": round(tot_wind_act_mwh, 1),
            "rawThermalProcuredMWh": round(tot_raw_thermal_mwh, 1),
            "bufferedThermalProcuredMWh": round(tot_buffered_thermal_mwh, 1),
            "actualThermalNeededMWh": round(tot_actual_thermal_needed_mwh, 1),
            "unhedgedShortfallMWh": round(raw_shortfall_mwh, 1),
            "hedgedShortfallMWh": round(buffered_shortfall_mwh, 1),
            "shortfallMitigatedPct": round(((raw_shortfall_mwh - buffered_shortfall_mwh) / raw_shortfall_mwh * 100) if raw_shortfall_mwh > 0 else 100.0, 1),
            "estimatedSavingsGBP": round(cashout_savings_gbp, 2)
        },
        "periods": results
    }
