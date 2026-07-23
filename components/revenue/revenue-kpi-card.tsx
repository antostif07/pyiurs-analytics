'use client';

import { Card } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  amount: number;
  budget: number;
  budgetTypeLabel?: string; // "Cible jour prévue", "Cible hebdo prévue", "Budget mensuel"
  isYesterday?: boolean;
}

const formatUSD = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

export function RevenueKPICard({
  label,
  amount,
  budget,
  budgetTypeLabel,
  isYesterday
}: KPICardProps) {
  // Calcul du taux d'atteinte %
  const percentage = budget > 0 ? Math.round((amount / budget) * 100) : 0;

  // Calcul de la variance en $ et en %
  const variance = amount - budget;
  const variancePercent = budget > 0 ? Math.round((variance / budget) * 100) : 0;

  return (
    <Card className={cn(
      "p-4 bg-card text-card-foreground rounded-2xl border border-border",
      "hover:border-primary/40 hover:shadow-md transition-all duration-200",
      "relative overflow-hidden flex flex-col justify-between"
    )}>
      {/* Barre de progression inférieure */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/60">
        <div
          className={cn(
            "h-full transition-all duration-500",
            percentage >= 100 ? 'bg-emerald-500' :
              percentage >= 75 ? 'bg-primary' : 'bg-rose-500'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* 1. En-tête : Intitulé & Badge Taux d'atteinte % */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {label}
          </span>
          {isYesterday && (
            <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[8px] font-mono font-bold rounded border border-border">
              J-1
            </span>
          )}
        </div>

        {/* Badge de Taux d'Atteinte de l'objectif */}
        {budget > 0 && (
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border",
            percentage >= 100
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
              percentage >= 75
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          )}>
            {percentage}% Atteint
          </div>
        )}
      </div>

      {/* 2. Vente Réalisée & Écart Comparatif ($ / %) */}
      <div className="space-y-1">
        <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
          {formatUSD(amount)}
        </div>

        {/* Écart vs Cible prévue (Variance $ et %) */}
        {budget > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className={cn(
              "font-semibold flex items-center gap-0.5",
              variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {variance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {variance >= 0 ? '+' : ''}{formatUSD(variance)}
            </span>
            <span className="text-muted-foreground/60 font-light">
              ({variance >= 0 ? '+' : ''}{variancePercent}%)
            </span>
          </div>
        )}
      </div>

      {/* 3. Pied de carte : Budget Prévu Explicite */}
      <div className=" pt-2 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1 text-muted-foreground/80 font-medium">
          <Target className="w-3 h-3 text-primary" />
          {budgetTypeLabel || "Cible prévue"}:
        </span>
        <strong className="text-foreground font-semibold">
          {formatUSD(budget)}
        </strong>
      </div>
    </Card>
  );
}