export interface PeriodForecast {
  settlementDate: string;
  settlementPeriod: number;
  startTime: string;
  actual: number | null;
  dayAheadForecast: number | null;
  daPublishTime: string | null;
  latestForecast: number | null;
  latestPublishTime: string | null;
  error: number | null;
  absError: number | null;
  pctError: number | null;
}

export interface DayAheadSummary {
  totalActualMWh: number;
  totalForecastMWh: number;
  maeMW: number;
  rmseMW: number;
  biasMW: number;
  wapePercent: number;
  periodsCount: number;
  overForecastPeriods: number;
  underForecastPeriods: number;
  direction: "OVER_FORECAST" | "UNDER_FORECAST" | "BALANCED";
}

export interface DayAheadResponse {
  deliveryDate: string;
  decisionDate: string;
  cutoffTime: string;
  cutoffIso: string;
  periods: PeriodForecast[];
  summary: DayAheadSummary;
  availableForecastRuns: string[];
}

export interface CalendarDay {
  date: string;
  actualGWh: number;
  forecastGWh: number;
  maeMW: number;
  biasMW: number;
  wapePercent: number;
  status: "EXCELLENT" | "GOOD" | "MODERATE" | "CHALLENGING";
  peakActualMW: number;
  peakForecastMW: number;
}

export interface AnalyticsSummary {
  evaluationPeriod: string;
  cutoffTime: string;
  totalSettlementPeriods: number;
  totalDays: number;
  totalActualGWh: number;
  totalForecastGWh: number;
  meanActualMW: number;
  meanForecastMW: number;
  maxActualMW: number;
  minActualMW: number;
  maeMW: number;
  rmseMW: number;
  mbeMW: number;
  wapePercent: number;
  nmaeCapacityPercent: number;
  nmaeMeanPercent: number;
  biasDirection: "OVER_FORECAST" | "UNDER_FORECAST" | "NEUTRAL";
  overForecastShare: number;
  underForecastShare: number;
  balancedShare: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  quantilesError: Record<string, number>;
  quantilesAbsError: Record<string, number>;
  calendarDays: CalendarDay[];
}

export interface HorizonMetric {
  horizon: string;
  sampleCount: number;
  maeMW: number;
  rmseMW: number;
  biasMW: number;
  wapePercent: number;
}

export interface SettlementPeriodProfile {
  settlementPeriod: number;
  time: string;
  isPeak: boolean;
  avgActualMW: number;
  avgForecastMW: number;
  biasMW: number;
  maeMW: number;
}

export interface DistributionBin {
  binStart: number;
  binEnd: number;
  label: string;
  count: number;
  percentage: number;
}

export interface DistributionResponse {
  binWidth: number;
  totalSamples: number;
  bins: DistributionBin[];
  riskShortfall: {
    shortfallOver1000MWPct: number;
    shortfallOver2000MWPct: number;
    surplusOver1000MWPct: number;
    surplusOver2000MWPct: number;
  };
}

export interface ProcurementPeriod {
  settlementPeriod: number;
  startTime: string;
  demandMW: number;
  windForecastMW: number;
  bufferedWindMW: number;
  windActualMW: number;
  thermalRawDA_MW: number;
  thermalBufferedDA_MW: number;
  thermalActualNeededMW: number;
  rawShortfallMW: number;
  bufferedShortfallMW: number;
}

export interface ProcurementResponse {
  deliveryDate: string;
  parameters: {
    scaleMode: string;
    peakDemandMW: number;
    windSharePct: number;
    riskConfidencePct: number;
    bufferMW: number;
    dayAheadPowerPriceGBP: number;
    cashoutPenaltyPriceGBP: number;
  };
  totals: {
    demandMWh: number;
    windForecastMWh: number;
    windActualMWh: number;
    rawThermalProcuredMWh: number;
    bufferedThermalProcuredMWh: number;
    actualThermalNeededMWh: number;
    unhedgedShortfallMWh: number;
    hedgedShortfallMWh: number;
    shortfallMitigatedPct: number;
    estimatedSavingsGBP: number;
  };
  periods: ProcurementPeriod[];
}
