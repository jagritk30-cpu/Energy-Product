"""
Unit tests for the FastAPI Wind Forecast & Procurement Platform.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["databaseReady"] is True
    assert data["actualsRecords"] > 1000
    assert data["forecastRecords"] > 15000

def test_day_ahead_forecast():
    response = client.get("/api/forecasts/day-ahead?deliveryDate=2026-01-15&cutoffTime=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert data["decisionDate"] == "2026-01-14"
    assert len(data["periods"]) == 48
    
    # Check first settlement period structure
    sp1 = data["periods"][0]
    assert sp1["settlementPeriod"] == 1
    assert "actual" in sp1
    assert "dayAheadForecast" in sp1
    assert "error" in sp1
    assert data["summary"]["maeMW"] is not None

def test_forecast_evolution():
    response = client.get("/api/forecasts/evolution?deliveryDate=2026-01-15")
    assert response.status_code == 200
    data = response.json()
    assert data["deliveryDate"] == "2026-01-15"
    assert "runs" in data
    assert len(data["runs"]) > 0

def test_analytics_metrics():
    response = client.get("/api/analytics/metrics?startDate=2026-01-01&endDate=2026-01-31&cutoffTime=11:00")
    assert response.status_code == 200
    data = response.json()
    summary = data["summary"]
    assert summary["totalDays"] == 31
    assert summary["maeMW"] > 0
    assert summary["rmseMW"] >= summary["maeMW"]
    assert "quantilesError" in data
    assert "P50" in data["quantilesError"]
    assert "calendarDays" in data
    assert len(data["calendarDays"]) == 31

def test_analytics_horizon():
    response = client.get("/api/analytics/horizon?startDate=2026-01-01&endDate=2026-01-31")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4
    # Horizons should generally show error degradation as lead time increases
    assert any("Intraday" in h["horizon"] for h in data)
    assert any("DA" in h["horizon"] for h in data)

def test_settlement_period_profile():
    response = client.get("/api/analytics/settlement-periods?startDate=2026-01-01&endDate=2026-01-31")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 48
    assert data[0]["settlementPeriod"] == 1
    assert data[-1]["settlementPeriod"] == 48

def test_error_distribution():
    response = client.get("/api/analytics/distribution?startDate=2026-01-01&endDate=2026-01-31")
    assert response.status_code == 200
    data = response.json()
    assert "bins" in data
    assert len(data["bins"]) > 0
    assert "riskShortfall" in data

def test_procurement_calculate():
    payload = {
        "deliveryDate": "2026-01-15",
        "cutoffTime": "11:00",
        "scaleMode": "national",
        "peakDemandMW": 38000,
        "windSharePct": 100,
        "riskConfidence": 90,
        "dayAheadPowerPriceGBP": 85.0,
        "cashoutPenaltyPriceGBP": 145.0
    }
    response = client.post("/api/procurement/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "parameters" in data
    assert "totals" in data
    assert len(data["periods"]) == 48
    assert data["totals"]["bufferedThermalProcuredMWh"] >= data["totals"]["rawThermalProcuredMWh"]
    assert data["totals"]["estimatedSavingsGBP"] >= 0
