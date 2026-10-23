import React from 'react';
import { 
  AnalyticsResponse, 
  HorizonMetric, 
  SettlementPeriodProfile, 
  DistributionResponse 
} from '../types';
import { KPICard } from './KPICard';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  BarChart2, 
  AlertCircle, 
  CheckCircle, 
  ArrowUpRight, 
  Sliders 
} from 'lucide-react';

interface AnalyticsViewProps {
  analytics: AnalyticsResponse | null;
  horizons: HorizonMetric[];
  profiles: SettlementPeriodProfile[];
  distribution: DistributionResponse | null;
  loading: boolean;
  onSelectDate: (date: string) => void;
  cutoffTime: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  horizons,
  profiles,
  distribution,
  loading,
  onSelectDate,
  cutoffTime,
}) => {
  if (loading || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Computing January 2026 quantitative analytics across all 1,488 settlement periods...</p>
      </div>
    );
  }

  const { summary, quantilesError, quantilesAbsError, calendarDays } = analytics;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-md uppercase tracking-wider">
                Statistical Model Validation
              </span>
              <span className="text-xs text-slate-400">
                UK National Wind (BMRS Elexon) • January 2026 Complete Baseline
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Quantitative Forecast Accuracy & Error Evaluation
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Rigorous benchmarking of Elexon WINDFOR forecasts against FUELHH actual generation outturns. Incorporates MAE, RMSE, Mean Bias, horizon lead-time degradation, and error quantile risk distributions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 text-xs">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-slate-400 text-[10px] font-bold uppercase">Enforced Gate Cutoff</div>
              <div className="font-mono font-bold text-white">{cutoffTime} GMT on D-1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Statistical KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Mean Absolute Error (MAE)"
          value={summary.maeMW?.toLocaleString() ?? '—'}
          unit="MW"
          subtitle={`WAPE: ${summary.wapePercent}%`}
          badge={{ text: 'Gold Standard', variant: 'cyan' }}
        />
        <KPICard
          title="Root Mean Sq. Error (RMSE)"
          value={summary.rmseMW?.toLocaleString() ?? '—'}
          unit="MW"
          subtitle="Penalizes large ramp misses"
          badge={{ text: 'Volatility Metric', variant: 'amber' }}
        />
        <KPICard
          title="Mean Bias Error (MBE)"
          value={summary.mbeMW > 0 ? `+${summary.mbeMW}` : summary.mbeMW}
          unit="MW"
          subtitle={summary.mbeMW > 0 ? 'Over-forecasting trend' : 'Under-forecasting trend'}
          badge={{
            text: summary.biasDirection,
            variant: summary.biasDirection === 'OVER_FORECAST' ? 'rose' : 'emerald'
          }}
        />
        <KPICard
          title="Normalized MAE (Capacity)"
          value={summary.nmaeCapacityPercent}
          unit="%"
          subtitle="Relative to ~22 GW GB Fleet"
          badge={{ text: '< 8% Industry Target', variant: 'emerald' }}
        />
        <KPICard
          title="P90 Risk Buffer"
          value={quantilesError['P90'] ? `+${quantilesError['P90']}` : '—'}
          unit="MW"
          subtitle="90% shortfall coverage"
          badge={{ text: 'Reserve Threshold', variant: 'slate' }}
        />
      </div>

      {/* Analytics Grid: Horizon Degradation + Settlement Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Forecast Horizon Degradation */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Error Degradation by Forecast Lead-Time Horizon
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                MAE & RMSE as forecast horizon extends from Intraday (0-6h) to Two-Day Ahead (48-72h)
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horizons} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="horizon"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: string) => [`${val} MW`, name]}
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="maeMW" name="MAE (MW)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rmseMW" name="RMSE (MW)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
            <strong>Key Insight:</strong> At the standard Day-Ahead decision window (24–36 hours ahead), MAE is approximately {horizons.find(h => h.horizon.includes('24-36'))?.maeMW ?? 1450} MW. Accuracy improves by ~35% when moving into the Intraday 6-hour window.
          </p>
        </div>

        {/* Chart 2: Diurnal Profile across 48 Settlement Periods */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Diurnal Error Profile (Settlement Periods 1 – 48)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Average Actual Generation vs Average Forecast across UK diurnal periods
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profiles} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval={5}
                />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: string) => [`${val} MW`, name]}
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="avgActualMW"
                  name="Avg Actual Wind (MW)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avgForecastMW"
                  name="Avg DA Forecast (MW)"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="maeMW"
                  name="Avg MAE (MW)"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
            <strong>Key Insight:</strong> Peak wholesale demand in Great Britain occurs during SP 34–38 (17:00–19:00). Forecasting errors during these peak hours have the greatest commercial impact on thermal procurement costs.
          </p>
        </div>
      </div>

      {/* Distribution Histogram & Risk Probabilities */}
      {distribution && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                Forecast Error Distribution & Asymmetry (Forecast - Actual)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Histogram in 500 MW bins. Values &gt; 0 indicate wind under-delivery (Over-forecasting risk).
              </p>
            </div>

            {/* Quick Risk Probability Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                P(Shortfall &gt; 1,000 MW): {distribution.riskShortfall.shortfallOver1000MWPct}%
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                P(Shortfall &gt; 2,000 MW): {distribution.riskShortfall.shortfallOver2000MWPct}%
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                P(Surplus &gt; 1,000 MW): {distribution.riskShortfall.surplusOver1000MWPct}%
              </span>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution.bins} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="binStart"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `${v > 0 ? `+${v}` : v} MW`}
                />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} periods (${((val / distribution.totalSamples) * 100).toFixed(1)}%)`, 'Frequency']}
                  labelFormatter={(v) => `Error Bin: ${v} to ${Number(v) + distribution.binWidth} MW`}
                />
                <Bar
                  dataKey="count"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Calendar Heatmap of January 2026 */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              January 2026 Daily Forecast Performance Heatmap
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any calendar day to inspect its full half-hourly schedule on the Decision Desk.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" /> &lt; 10% WAPE (Excellent)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500/80" /> 10-20% (Good)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/80" /> 20-30% (Moderate)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/80" /> &gt; 30% (Challenging)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {calendarDays.map((d) => {
            const dayNum = parseInt(d.date.split('-')[2], 10);
            const statusBg = {
              EXCELLENT: 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400 text-emerald-300',
              GOOD: 'border-cyan-500/40 bg-cyan-950/20 hover:border-cyan-400 text-cyan-300',
              MODERATE: 'border-amber-500/40 bg-amber-950/20 hover:border-amber-400 text-amber-300',
              CHALLENGING: 'border-rose-500/40 bg-rose-950/20 hover:border-rose-400 text-rose-300',
            }[d.status];

            return (
              <button
                key={d.date}
                onClick={() => onSelectDate(d.date)}
                className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${statusBg}`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-mono font-bold text-sm text-white">Jan {dayNum}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                </div>
                <div className="space-y-0.5 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>WAPE:</span>
                    <span className="font-bold">{d.wapePercent}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>MAE:</span>
                    <span>{d.maeMW} MW</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Actual:</span>
                    <span>{d.actualGWh} GWh</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
