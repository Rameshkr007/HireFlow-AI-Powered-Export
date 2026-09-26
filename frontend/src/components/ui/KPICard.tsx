import React from 'react';
import { LucideIcon, TrendingUp } from 'lucide-react';

interface Props {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
  trend?: number;
}

export default function KPICard({ title, value, icon: Icon, color = 'primary', subtitle, trend }: Props) {
  const colorMap = {
    primary: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  };
  const c = colorMap[color as keyof typeof colorMap] || colorMap.primary;

  return (
    <div className="kpi-card group card-hover">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-dark-50">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        <div className="text-sm font-medium text-dark-300">{title}</div>
        {subtitle && <div className="text-xs text-dark-500 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}
