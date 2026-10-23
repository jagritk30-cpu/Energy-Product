import React, { useState, useEffect } from 'react';
import { ProcurementResponse } from '../types';
import { calculateProcurement } from '../api';
import { KPICard } from './KPICard';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  ShieldCheck, 
  Flame, 
  Coins, 
  CheckCircle2, 
  AlertOctagon, 
  Settings2, 
  Sparkles 
} from 'lucide-react';

interface ProcurementSimulatorProps {
  deliveryDate: string;
  cutoffTime: string;
}

export const ProcurementSimulator: React.FC<ProcurementSimulatorProps> = ({
  deliveryDate,
  cutoffTime,
}) => {
  const [scaleMode, setScaleMode] = useState<'national' | 'utility'>('national');
  const [peakDemandMW, setPeakDemandMW] = useState(38000);
  const [windSharePct, setWindSharePct] = useState(100);
  const [riskConfidence, setRiskConfidence] = useState<number>(90);
  const [daPrice, setDaPrice] = useState(85.0);
  const [cashoutPrice, setCashoutPrice] = useState(145.0);
  const [procurementData, setProcurementData] = useState<ProcurementResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync scale mode defaults
  const handleScaleChange = (mode: 'national' | 'utility') => {
    setScaleMode(mode);
    if (mode === 'national') {
      setPeakDemandMW(38000);
      setWindSharePct(100);
    } else {
      setPeakDemandMW(2800);
      setWindSharePct(8.5);
    }
  };

  const runCalculation = async () => {
    setLoading(true);
    try {
      const data = await calculateProcurement({
        deliveryDate,
        cutoffTime,
        scaleMode,
        peakDemandMW,
        windSharePct,
        riskConfidence,
        dayAheadPowerPriceGBP: daPrice,
        cashoutPenaltyPriceGBP: cashoutPrice,
      });
      setProcurementData(data);
    } catch (err) {
      console.error('Error running procurement calculation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [deliveryDate, cutoffTime, scaleMode, peakDemandMW, windSharePct, riskConfidence, daPrice, cashoutPrice]);

  const chartData = procurementData?.periods.map((p) => {
    const mins = (p.settlementPeriod - 1) * 30;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const label = `${hh}:${mm}`;

    return {
      period: p.settlementPeriod,
      time: label,
      demand: p.demandMW,
      windForecast: p.windForecastMW,
      bufferedWind: p.bufferedWindMW,
      windActual: p.windActualMW,
      thermalRaw: p.thermalRawDA_MW,
      thermalBuffered: p.thermalBufferedDA_MW,
      thermalActualNeeded: p.thermalActualNeededMW,
    };
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md uppercase tracking-wider">
                Wholesale Day-Ahead Decision Engine
              </span>
              <span className="text-xs text-slate-400">
                Delivery Date: <strong className="text-white font-mono">{deliveryDate}</strong> • Gate Cutoff: <strong className="text-amber-400 font-mono">{cutoffTime} GMT</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Net Thermal Power Procurement & Risk Buffer Calculator
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Determine the exact volume of additional thermal generation to procure beyond renewable wind, incorporating historical forecast error quantiles to protect against volatile balancing mechanism cashout spikes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => handleScaleChange('national')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scaleMode === 'national'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              National Grid Scale
            </button>
            <button
              onClick={() => handleScaleChange('utility')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scaleMode === 'utility'
                  ? 'bg-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Utility Portfolio Scale
            </button>
          </div>
        </div>
      </div>

      {/* Control Configuration Panel */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          Trading Parameters & Risk Confidence Controls
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Peak Demand */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <label className="block text-slate-400 mb-1 font-semibold">
              Peak Consumer Demand (MW)
            </label>
            <input
              type="number"
              value={peakDemandMW}
              onChange={(e) => setPeakDemandMW(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              {scaleMode === 'national' ? 'Representative UK Winter Peak ~38 GW' : 'Utility Customer Base'}
            </span>
          </div>

          {/* Wind Contract Share */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <label className="block text-slate-400 mb-1 font-semibold">
              Wind Share / Contract %
            </label>
            <input
              type="number"
              value={windSharePct}
              onChange={(e) => setWindSharePct(Number(e.target.value))}
              max={100}
              min={1}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Share of GB National Wind Generation
            </span>
          </div>

          {/* Risk Buffer Confidence */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <label className="block text-slate-400 mb-1 font-semibold">
              Risk Tolerance Confidence
            </label>
            <select
              value={riskConfidence}
              onChange={(e) => setRiskConfidence(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value={50}>50% (Deterministic - Zero Buffer)</option>
              <option value={80}>80% Confidence (Moderate Buffer)</option>
              <option value={90}>90% Confidence (Recommended Standard)</option>
              <option value={95}>95% Confidence (Ultra-Conservative)</option>
            </select>
            <span className="text-[10px] text-cyan-400 mt-1 block">
              Buffer: +{procurementData?.parameters.bufferMW ?? 0} MW thermal reserve
            </span>
          </div>

          {/* Price Spread Assumptions */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <label className="block text-slate-400 mb-1 font-semibold">
              Power Prices (£/MWh)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={daPrice}
                onChange={(e) => setDaPrice(Number(e.target.value))}
                title="Day-Ahead Price (£/MWh)"
                className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
              />
              <span className="text-slate-500">DA /</span>
              <input
                type="number"
                value={cashoutPrice}
                onChange={(e) => setCashoutPrice(Number(e.target.value))}
                title="Cashout Imbalance Penalty (£/MWh)"
                className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
              />
              <span className="text-slate-500">Imb</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Spread: £{(cashoutPrice - daPrice).toFixed(1)}/MWh penalty
            </span>
          </div>
        </div>
      </div>

      {/* Procurement Impact Metrics */}
      {procurementData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Consumer Demand"
            value={Math.round(procurementData.totals.demandMWh / 1000).toLocaleString()}
            unit="GWh"
            subtitle="Customer energy requirement"
            badge={{ text: 'Base Load', variant: 'slate' }}
          />
          <KPICard
            title="Recommended Thermal Buy"
            value={Math.round(procurementData.totals.bufferedThermalProcuredMWh / 1000).toLocaleString()}
            unit="GWh"
            subtitle={`Raw: ${Math.round(procurementData.totals.rawThermalProcuredMWh / 1000)} GWh (+${Math.round((procurementData.totals.bufferedThermalProcuredMWh - procurementData.totals.rawThermalProcuredMWh) / 1000)} GWh buffer)`}
            badge={{ text: `${riskConfidence}% Confidence`, variant: 'cyan' }}
          />
          <KPICard
            title="Shortfall Risk Mitigated"
            value={`${procurementData.totals.shortfallMitigatedPct}%`}
            subtitle={`${Math.round(procurementData.totals.unhedgedShortfallMWh)} MWh unhedged shortfall protected`}
            badge={{
              text: procurementData.totals.shortfallMitigatedPct > 80 ? 'Protected' : 'Partial Cover',
              variant: procurementData.totals.shortfallMitigatedPct > 80 ? 'emerald' : 'amber'
            }}
          />
          <KPICard
            title="Cashout Imbalance Saved"
            value={`£${(procurementData.totals.estimatedSavingsGBP / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}
            subtitle="Avoided balancing mechanism penalties"
            badge={{ text: 'Net Financial Value', variant: 'emerald' }}
          />
        </div>
      )}

      {/* Thermal Procurement Schedule Chart */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Day-Ahead Net Thermal Procurement Schedule
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consumer Demand minus Wind Generation = Thermal Power Procurement Requirement (MW)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-0.5 bg-slate-400" /> Consumer Demand
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="w-3 h-0.5 bg-cyan-400" /> Wind Forecast
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-3 h-0.5 bg-amber-400" /> Recommended Thermal Buy
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-3 h-0.5 bg-emerald-400" /> Actual Thermal Needed
            </span>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                interval={3}
                label={{ value: 'Settlement Time (UTC)', position: 'insideBottom', offset: -15, fill: '#64748B', fontSize: 11 }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                label={{ value: 'Power (MW)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748B', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
                formatter={(val: any, name: string) => [`${val?.toLocaleString()} MW`, name]}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />

              {/* Demand Profile */}
              <Line
                type="monotone"
                dataKey="demand"
                name="Consumer Demand (MW)"
                stroke="#94A3B8"
                strokeWidth={2}
                dot={false}
              />

              {/* Actionable Wind Forecast */}
              <Line
                type="monotone"
                dataKey="windForecast"
                name="Wind Forecast (DA)"
                stroke="#06B6D4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* Recommended Thermal Procurement (with buffer) */}
              <Area
                type="monotone"
                dataKey="thermalBuffered"
                name="Recommended Thermal Buy (MW)"
                fill="#F59E0B"
                fillOpacity={0.15}
                stroke="#F59E0B"
                strokeWidth={3}
              />

              {/* Actual Thermal Needed Outturn */}
              <Line
                type="monotone"
                dataKey="thermalActualNeeded"
                name="Actual Thermal Needed (Outturn)"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Operational Takeaway Box */}
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 via-slate-800/40 to-slate-800/40 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-slate-300">
          <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-white text-sm">Actionable Procurement Decision for Day D:</span>
            <p className="mt-1 leading-relaxed">
              By purchasing <strong className="text-amber-300 font-mono">{Math.round(procurementData?.totals.bufferedThermalProcuredMWh ?? 0).toLocaleString()} MWh</strong> in the Day-Ahead auction (rather than the naive unbuffered {Math.round(procurementData?.totals.rawThermalProcuredMWh ?? 0).toLocaleString()} MWh), your trading desk achieves <strong className="text-emerald-300 font-mono">{procurementData?.totals.shortfallMitigatedPct}% coverage</strong> against wind under-generation, avoiding an estimated <strong className="text-emerald-300 font-mono">£{Math.round(procurementData?.totals.estimatedSavingsGBP ?? 0).toLocaleString()}</strong> in costly imbalance cashout charges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
