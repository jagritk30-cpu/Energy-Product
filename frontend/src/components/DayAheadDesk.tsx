import React, { useState } from 'react';
import { 
  DayAheadResponse 
} from '../types';
import { KPICard } from './KPICard';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Layers, 
  SlidersHorizontal 
} from 'lucide-react';

interface DayAheadDeskProps {
  data: DayAheadResponse | null;
  loading: boolean;
  deliveryDate: string;
  cutoffTime: string;
}

export const DayAheadDesk: React.FC<DayAheadDeskProps> = ({
  data,
  loading,
  deliveryDate,
  cutoffTime
}) => {
  const [showActuals, setShowActuals] = useState(true);
  const [showLatest, setShowLatest] = useState(true);
  const [showErrorBars, setShowErrorBars] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Resolving Day-Ahead wind forecasts for {deliveryDate}...</p>
      </div>
    );
  }

  const { summary, periods } = data;

  // Format chart data
  const chartData = periods.map((p) => {
    const mins = (p.settlementPeriod - 1) * 30;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const label = `${hh}:${mm}`;

    const err = p.error !== null ? p.error : 0;
    return {
      period: p.settlementPeriod,
      time: label,
      dayAhead: p.dayAheadForecast,
      actual: p.actual,
      latest: p.latestForecast,
      errorPositive: err > 0 ? err : 0, // Over-forecast (Shortfall risk)
      errorNegative: err < 0 ? err : 0, // Under-forecast (Surplus)
      errorRaw: err,
      absError: p.absError,
      pctError: p.pctError,
    };
  });

  // Filter table
  const filteredPeriods = periods.filter((p) => {
    if (!searchFilter) return true;
    const mins = (p.settlementPeriod - 1) * 30;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    return (
      String(p.settlementPeriod).includes(searchFilter) ||
      timeStr.includes(searchFilter)
    );
  });

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Settlement Date',
      'Settlement Period',
      'Target Start Time',
      'Day-Ahead Forecast (MW)',
      'DA Publish Time',
      'Actual Outturn (MW)',
      'Latest Intraday Forecast (MW)',
      'Error (MW)',
      'Abs Error (MW)',
      'Error %'
    ];
    const rows = periods.map((p) => [
      p.settlementDate,
      p.settlementPeriod,
      p.startTime,
      p.dayAheadForecast ?? '',
      p.daPublishTime ?? '',
      p.actual ?? '',
      p.latestForecast ?? '',
      p.error ?? '',
      p.absError ?? '',
      p.pctError ?? ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Elexon_DayAhead_${deliveryDate}_cutoff_${cutoffTime.replace(':', '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md uppercase tracking-wider">
                Actionable Day-Ahead Desk
              </span>
              <span className="text-xs text-slate-400">
                Decision Date: <strong className="text-white font-mono">{data.decisionDate}</strong> before{' '}
                <strong className="text-amber-400 font-mono">{cutoffTime} GMT</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Delivery Schedule for {deliveryDate}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Showing the latest Elexon WINDFOR forecast published prior to the Day-Ahead gate closure cutoff, compared directly against FUELHH actual generation outturns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export Schedule (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Day-Ahead Forecast"
          value={Math.round(summary.totalForecastMWh / 1000).toLocaleString()}
          unit="GWh"
          subtitle="Total expected generation"
          badge={{ text: 'DA Order Basis', variant: 'cyan' }}
        />
        <KPICard
          title="Actual Outturn"
          value={Math.round(summary.totalActualMWh / 1000).toLocaleString()}
          unit="GWh"
          subtitle="Delivered wind generation"
          badge={{ text: 'BMRS FUELHH', variant: 'emerald' }}
        />
        <KPICard
          title="Mean Absolute Error"
          value={summary.maeMW ?? 'N/A'}
          unit="MW"
          subtitle={`WAPE: ${summary.wapePercent}%`}
          badge={{
            text: summary.wapePercent < 15 ? 'High Accuracy' : 'Volatile Day',
            variant: summary.wapePercent < 15 ? 'emerald' : 'amber'
          }}
        />
        <KPICard
          title="Forecast Bias (MBE)"
          value={summary.biasMW > 0 ? `+${summary.biasMW}` : summary.biasMW}
          unit="MW"
          subtitle={summary.biasMW > 0 ? 'Over-forecasted (Shortfall)' : 'Under-forecasted (Surplus)'}
          badge={{
            text: summary.direction === 'OVER_FORECAST' ? 'Procure Thermal Buffer' : 'Surplus Position',
            variant: summary.direction === 'OVER_FORECAST' ? 'rose' : 'emerald'
          }}
        />
        <KPICard
          title="Periods Breakdown"
          value={`${summary.overForecastPeriods} / ${summary.underForecastPeriods}`}
          unit="SP"
          subtitle="Over vs Under forecast SPs"
          badge={{
            text: '48 SP Total',
            variant: 'slate'
          }}
        />
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Settlement Period Power Profiles (Settlement Periods 1 – 48)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare actionable Day-Ahead forecast curve against actual delivery outturns and intraday revisions.
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowActuals(!showActuals)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
                showActuals
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Actual Outturn
            </button>
            <button
              onClick={() => setShowLatest(!showLatest)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
                showLatest
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800 line-through'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Latest Intraday
            </button>
            <button
              onClick={() => setShowErrorBars(!showErrorBars)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
                showErrorBars
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800 line-through'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Error Bars
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                interval={3}
                label={{ value: 'Target Settlement Time (UTC)', position: 'insideBottom', offset: -15, fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748B', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                  fontSize: '12px'
                }}
                formatter={(val: any, name: string) => {
                  if (name.includes('Error')) return [`${val} MW`, name];
                  return [`${val?.toLocaleString()} MW`, name];
                }}
                labelFormatter={(label, payload) => {
                  const sp = payload?.[0]?.payload?.period;
                  return `Settlement Period ${sp} • ${label} UTC`;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />

              {/* Day Ahead Actionable Forecast */}
              <Line
                type="monotone"
                dataKey="dayAhead"
                name={`Day-Ahead Forecast (≤ ${cutoffTime})`}
                stroke="#06B6D4"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#06B6D4' }}
              />

              {/* Actual Generation */}
              {showActuals && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Outturn (FUELHH)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10B981' }}
                />
              )}

              {/* Latest Intraday Forecast */}
              {showLatest && (
                <Line
                  type="monotone"
                  dataKey="latest"
                  name="Latest Intraday Forecast"
                  stroke="#A855F7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {/* Error Bars */}
              {showErrorBars && (
                <Bar
                  dataKey="errorPositive"
                  name="Shortfall Risk (Forecast > Actual)"
                  fill="#F43F5E"
                  opacity={0.35}
                />
              )}
              {showErrorBars && (
                <Bar
                  dataKey="errorNegative"
                  name="Surplus (Actual > Forecast)"
                  fill="#3B82F6"
                  opacity={0.35}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Key Insight Note */}
        <div className="mt-4 p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-white">Day-Ahead Trading Decision Rule:</span>{' '}
            At gate closure on {data.decisionDate} {cutoffTime} GMT, this forecast represented the exact volume the trading desk had to assume for net thermal procurement. Red error bars denote where actual wind fell short, which required thermal replacement or incurred system imbalance cashout penalties.
          </div>
        </div>
      </div>

      {/* Half-Hourly Settlement Period Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Settlement Periods Granular Audit</h3>
            <p className="text-xs text-slate-400">All 48 half-hourly periods for {deliveryDate}</p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter by SP or time (e.g. 14, 18:00)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-800/70 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/80 text-slate-400 font-sans uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">SP</th>
                <th className="py-2.5 px-4">Time (UTC)</th>
                <th className="py-2.5 px-4 text-right">DA Forecast (MW)</th>
                <th className="py-2.5 px-4 text-right">Actual Outturn (MW)</th>
                <th className="py-2.5 px-4 text-right">Error (MW)</th>
                <th className="py-2.5 px-4 text-right">Abs Error (MW)</th>
                <th className="py-2.5 px-4 text-right">Error %</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPeriods.map((p) => {
                const mins = (p.settlementPeriod - 1) * 30;
                const hh = String(Math.floor(mins / 60)).padStart(2, '0');
                const mm = String(mins % 60).padStart(2, '0');
                const timeStr = `${hh}:${mm}`;

                const err = p.error ?? 0;
                const isOver = err > 100;
                const isUnder = err < -100;

                return (
                  <tr key={p.settlementPeriod} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-4 font-bold text-white">{p.settlementPeriod}</td>
                    <td className="py-2 px-4 font-medium text-slate-400 font-sans">{timeStr}</td>
                    <td className="py-2 px-4 text-right font-bold text-cyan-400">
                      {p.dayAheadForecast?.toLocaleString() ?? '—'}
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-emerald-400">
                      {p.actual?.toLocaleString() ?? '—'}
                    </td>
                    <td
                      className={`py-2 px-4 text-right font-bold ${
                        isOver ? 'text-rose-400' : isUnder ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {err > 0 ? `+${err.toLocaleString()}` : err.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-300">
                      {p.absError?.toLocaleString() ?? '—'}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-400 font-sans">
                      {p.pctError !== null ? `${p.pctError}%` : '—'}
                    </td>
                    <td className="py-2 px-4 font-sans">
                      {isOver ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Shortfall
                        </span>
                      ) : isUnder ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Surplus
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Matched
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
