'use client';

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  amount: number;
  budget: number;
  isYesterday?: boolean;
  trend?: 'up' | 'down';
  trendValue?: number;
}

export function RevenueKPICard({ 
  label, 
  amount, 
  budget, 
  isYesterday,
  trend,
  trendValue 
}: KPICardProps) {
  const percentage = budget === 0 ? 0 : Math.round((amount / budget) * 100);
  const variance = amount - budget;
  const variancePercentage = budget === 0 ? 0 : Math.round((variance / budget) * 100);

  return (
    <Card className={cn(
      "p-3 bg-white rounded-xl border border-slate-200",
      "hover:border-slate-300 hover:shadow-md transition-all",
      "relative overflow-hidden"
    )}>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
        <div 
          className={cn(
            "h-full transition-all",
            percentage >= 100 ? 'bg-emerald-500' : 
            percentage >= 80 ? 'bg-amber-500' : 'bg-rose-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Header with amount */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </span>
          {isYesterday && (
            <span className="px-1 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-medium rounded">
              J-1
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {trend && trendValue && (
            <div className={cn(
              "flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded",
              trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            )}>
              {trend === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Amount and metrics row */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            ${amount.toLocaleString()}
          </h3>
          <span className={cn(
            "text-[10px] font-medium",
            variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {variance >= 0 ? '+' : ''}{variancePercentage}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[9px] text-slate-400 mr-1">Budget:</span>
            <span className="text-[10px] font-semibold text-slate-700">
              ${budget.toLocaleString()}
            </span>
          </div>
          <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50">
            <span className={cn(
              "text-[9px] font-bold",
              percentage >= 100 ? 'text-emerald-600' :
              percentage >= 80 ? 'text-amber-600' : 'text-rose-600'
            )}>
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}