"""
FastAPI application for UK Energy Utility Day-Ahead Wind Forecast & Procurement Platform.
"""
import os
from fastapi import FastAPI, APIRouter, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

from backend.database import is_db_populated, get_db_connection
from backend.services.forecast_service import get_day_ahead_schedule, get_forecast_evolution
from backend.services.analytics_service import (
    get_overall_metrics,
    get_forecast_horizon_analysis,
    get_settlement_period_profile,
    get_error_distribution
)
from backend.services.procurement_service import calculate_net_procurement

app = FastAPI(
    title="UK Wind Generation Day-Ahead Forecast & Procurement Intelligence",
    description="Operational decision support and quantitative error analytics for UK wholesale electricity traders.",
    version="1.0.0"
)

# Enable CORS for local development and Vercel/Heroku deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcurementRequest(BaseModel):
    deliveryDate: str = Field(default="2026-01-15", description="Delivery date (YYYY-MM-DD)")
    cutoffTime: str = Field(default="11:00", description="D-1 decision cutoff time (HH:MM)")
    scaleMode: str = Field(default="national", description="'national' or 'utility'")
    peakDemandMW: float = Field(default=38000.0, description="Peak customer demand MW")
    windSharePct: float = Field(default=100.0, description="Wind share percentage")
    riskConfidence: int = Field(default=90, description="Confidence level: 50, 80, 90, 95")
    dayAheadPowerPriceGBP: float = Field(default=85.0, description="Day-Ahead power price £/MWh")
    cashoutPenaltyPriceGBP: float = Field(default=145.0, description="Imbalance cashout price £/MWh")

router = APIRouter()

@router.get("/health")
def health():
    populated = is_db_populated()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM actual_generation")
    act_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM forecast_generation")
    fc_count = cur.fetchone()[0]
    conn.close()
    
    return {
        "status": "online",
        "databaseReady": populated,
        "actualsRecords": act_count,
        "forecastRecords": fc_count,
        "targetMonth": "January 2026",
        "market": "UK Day-Ahead Power Market (BMRS Elexon)"
    }

@router.get("/forecasts/day-ahead")
def day_ahead_forecast(
    deliveryDate: str = Query("2026-01-15", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoffTime: str = Query("11:00", pattern=r"^\d{2}:\d{2}$")
):
    try:
        return get_day_ahead_schedule(deliveryDate, cutoffTime)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecasts/evolution")
def forecast_evolution(
    deliveryDate: str = Query("2026-01-15", pattern=r"^\d{4}-\d{2}-\d{2}$")
):
    try:
        return get_forecast_evolution(deliveryDate)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/metrics")
def analytics_metrics(
    startDate: str = Query("2026-01-01"),
    endDate: str = Query("2026-01-31"),
    cutoffTime: str = Query("11:00")
):
    try:
        return get_overall_metrics(startDate, endDate, cutoffTime)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/horizon")
def analytics_horizon(
    startDate: str = Query("2026-01-01"),
    endDate: str = Query("2026-01-31")
):
    try:
        return get_forecast_horizon_analysis(startDate, endDate)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/settlement-periods")
def analytics_settlement_periods(
    startDate: str = Query("2026-01-01"),
    endDate: str = Query("2026-01-31"),
    cutoffTime: str = Query("11:00")
):
    try:
        return get_settlement_period_profile(startDate, endDate, cutoffTime)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/distribution")
def analytics_distribution(
    startDate: str = Query("2026-01-01"),
    endDate: str = Query("2026-01-31"),
    cutoffTime: str = Query("11:00")
):
    try:
        return get_error_distribution(startDate, endDate, cutoffTime)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/procurement/calculate")
def procurement_calculate(req: ProcurementRequest):
    try:
        return calculate_net_procurement(
            delivery_date=req.deliveryDate,
            cutoff_time=req.cutoffTime,
            scale_mode=req.scaleMode,
            peak_demand_mw=req.peakDemandMW,
            wind_share_pct=req.windSharePct,
            risk_confidence=req.riskConfidence,
            da_power_price_gbp=req.dayAheadPowerPriceGBP,
            cashout_imbalance_penalty_gbp=req.cashoutPenaltyPriceGBP
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount router under both /api and root to guarantee compatibility on Vercel and local
app.include_router(router, prefix="/api")
app.include_router(router)

# Mount frontend build static files if present (for single-container/local deployment)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
