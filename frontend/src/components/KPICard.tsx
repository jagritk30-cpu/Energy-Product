import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  };
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  badge,
}) => {
  const badgeStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    slate: 'bg-slate-700/30 text-slate-400 border-slate-700/50',
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-xs">
        {subtitle && <span className="text-slate-400 font-medium truncate">{subtitle}</span>}
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              badgeStyles[badge.variant]
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};
