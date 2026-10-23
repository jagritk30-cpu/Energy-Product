import React from 'react';
import { 
  CloudLightning, 
  Wind, 
  SunMedium, 
  Compass, 
  ArrowRight, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';

interface EventExplorerProps {
  onSelectEvent: (date: string) => void;
}

export const EventExplorer: React.FC<EventExplorerProps> = ({ onSelectEvent }) => {
  const events = [
    {
      id: 'storm-henk',
      date: '2026-01-02',
      title: 'Storm Henk Gale & Wind Surge',
      type: 'EXTREME_WIND',
      icon: <CloudLightning className="w-5 h-5 text-cyan-400" />,
      badge: { text: 'High Generation Surge', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
      description:
        'A deep low-pressure system drove widespread gale-force winds across the North Sea and Irish Sea. Total GB wind output surged past 18,500 MW. The forecast under-predicted the ramp speed by ~1,800 MW in the early morning.',
      impact:
        'Over-hedging risk: Wholesale power prices collapsed into low single-digits. Utilities with unhedged wind surplus had to spill or dump power on the spot market.',
      recommendation:
        'In extreme storm conditions, apply negative buffers or hedge via short-term flexible intraday contracts.',
      peakWindMW: 18700,
      maeMW: 1680,
    },
    {
      id: 'dunkelflaute',
      date: '2026-01-10',
      title: 'Mid-Winter Dunkelflaute (Calm Spell)',
      type: 'LOW_WIND',
      icon: <SunMedium className="w-5 h-5 text-amber-400" />,
      badge: { text: 'Severe Wind Drought', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
      description:
        'A stationary high-pressure ridge parked over Great Britain, bringing freezing temperatures and near-zero surface wind speeds. Fleet-wide generation languished below 2,100 MW (less than 10% load factor).',
      impact:
        'Critical thermal dispatch requirement: CCGT gas and coal peakers had to run at maximum output to meet 42 GW consumer winter heating peak.',
      recommendation:
        'Day-ahead forecast accurately pinned the low baseline. Utilities successfully secured forward thermal hedges with minimal imbalance risk.',
      peakWindMW: 2400,
      maeMW: 420,
    },
    {
      id: 'ramp-lag',
      date: '2026-01-17',
      title: 'Atlantic Frontal Ramp Phase Error',
      type: 'TIMING_ERROR',
      icon: <Wind className="w-5 h-5 text-rose-400" />,
      badge: { text: '3-Hour Ramp Lag', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
      description:
        'A fast-moving weather front swept across Scotland. While the total daily energy volume was well predicted, the front arrived 3.5 hours earlier than the numerical weather model expected.',
      impact:
        'Timing mismatch: Traders faced acute shortfall during SP 14–20, followed by severe surplus during SP 26–32, creating two-way balancing friction.',
      recommendation:
        'Use intraday gate closure updates to continuously true-up thermal positions as the physical frontal line approaches.',
      peakWindMW: 14200,
      maeMW: 2150,
    },
    {
      id: 'storm-isha',
      date: '2026-01-22',
      title: 'Storm Isha & Jocelyn Cut-Out Event',
      type: 'TURBINE_CUTOUT',
      icon: <AlertTriangle className="w-5 h-5 text-purple-400" />,
      badge: { text: 'Turbine Cut-Out Risk', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      description:
        'Violent wind gusts exceeded 25 m/s (55 mph) across offshore Scottish wind farms, triggering automated storm cut-out protection on multiple multi-megawatt offshore arrays.',
      impact:
        'High-wind cut-out resulted in sudden drop in expected generation despite severe gale conditions, causing an unexpected 2,400 MW shortfall.',
      recommendation:
        'Enforce our P95 safety buffer during extreme wind advisories to pre-emptively procure standby thermal dispatch.',
      peakWindMW: 20100,
      maeMW: 2480,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-md uppercase tracking-wider">
              Operational Case Studies
            </span>
            <span className="text-xs text-slate-400">
              January 2026 High-Impact Dispatch Case Studies
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Extreme Weather & Wind Ramp Event Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Examine how sudden frontal passages, Dunkelflaute calm spells, and Atlantic storms stress-tested day-ahead forecasting accuracy and thermal procurement strategies in January 2026.
          </p>
        </div>
      </div>

      {/* Event Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                    {ev.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">{ev.title}</h2>
                    <span className="text-xs font-mono text-slate-400">{ev.date}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${ev.badge.color}`}>
                  {ev.badge.text}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {ev.description}
              </p>

              <div className="space-y-2 mb-5">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                  <span className="font-semibold text-rose-400 block mb-0.5">Market & Dispatch Impact:</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">{ev.impact}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                  <span className="font-semibold text-cyan-400 block mb-0.5">Recommended Trading Strategy:</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">{ev.recommendation}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-2">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Peak Wind</span>
                  <span className="font-bold text-white">{ev.peakWindMW.toLocaleString()} MW</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Day MAE</span>
                  <span className="font-bold text-amber-400">{ev.maeMW.toLocaleString()} MW</span>
                </div>
              </div>

              <button
                onClick={() => onSelectEvent(ev.date)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-cyan-400 text-xs font-bold rounded-xl border border-cyan-500/30 transition shadow-sm"
              >
                Inspect Day-Ahead
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
