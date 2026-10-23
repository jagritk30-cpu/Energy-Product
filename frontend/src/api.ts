import {
  DayAheadResponse,
  AnalyticsResponse,
  HorizonMetric,
  SettlementPeriodProfile,
  DistributionResponse,
  ProcurementResponse
} from './types';

const API_BASE = '/api';

export async function fetchDayAhead(deliveryDate: string, cutoffTime: string = '11:00'): Promise<DayAheadResponse> {
  const res = await fetch(`${API_BASE}/forecasts/day-ahead?deliveryDate=${deliveryDate}&cutoffTime=${cutoffTime}`);
  if (!res.ok) throw new Error(`Failed to fetch day-ahead forecast: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyticsMetrics(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  cutoffTime: string = '11:00'
): Promise<AnalyticsResponse> {
  const res = await fetch(`${API_BASE}/analytics/metrics?startDate=${startDate}&endDate=${endDate}&cutoffTime=${cutoffTime}`);
  if (!res.ok) throw new Error(`Failed to fetch analytics metrics: ${res.statusText}`);
  return res.json();
}

export async function fetchHorizonAnalysis(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31'
): Promise<HorizonMetric[]> {
  const res = await fetch(`${API_BASE}/analytics/horizon?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) throw new Error(`Failed to fetch horizon analysis: ${res.statusText}`);
  return res.json();
}

export async function fetchSettlementPeriodProfile(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  cutoffTime: string = '11:00'
): Promise<SettlementPeriodProfile[]> {
  const res = await fetch(`${API_BASE}/analytics/settlement-periods?startDate=${startDate}&endDate=${endDate}&cutoffTime=${cutoffTime}`);
  if (!res.ok) throw new Error(`Failed to fetch settlement period profile: ${res.statusText}`);
  return res.json();
}

export async function fetchErrorDistribution(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  cutoffTime: string = '11:00'
): Promise<DistributionResponse> {
  const res = await fetch(`${API_BASE}/analytics/distribution?startDate=${startDate}&endDate=${endDate}&cutoffTime=${cutoffTime}`);
  if (!res.ok) throw new Error(`Failed to fetch error distribution: ${res.statusText}`);
  return res.json();
}

export async function calculateProcurement(params: {
  deliveryDate: string;
  cutoffTime: string;
  scaleMode: string;
  peakDemandMW: number;
  windSharePct: number;
  riskConfidence: number;
  dayAheadPowerPriceGBP: number;
  cashoutPenaltyPriceGBP: number;
}): Promise<ProcurementResponse> {
  const res = await fetch(`${API_BASE}/procurement/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error(`Failed to calculate procurement: ${res.statusText}`);
  return res.json();
}
