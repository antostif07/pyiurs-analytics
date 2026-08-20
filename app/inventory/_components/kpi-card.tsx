"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";

type SparklinePoint = number | { v: number; date?: string };

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string; // ✅ Valorisation financière ($ USD)
  trend: number;
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  sparkData: SparklinePoint[];
  sparkColor: string;
  index: number;
}

export default function KpiCard({
  title,
  value,
  subValue,
  trend,
  trendLabel = "vs période précédente",
  icon,
  iconBg,
  sparkData = [],
  sparkColor,
  index,
}: KpiCardProps) {
  // ✅ Identifiant SVG unique et sécurisé (évite les erreurs avec les hexadécimaux et var(--...))
  const gradientId = useId();
  const positive = trend >= 0;

  // Normalisation sécurisée des points pour Recharts
  const chartData = useMemo(() => {
    if (!sparkData || sparkData.length === 0) {
      return [{ v: 0 }, { v: 0 }];
    }
    return sparkData.map((d) => (typeof d === "number" ? { v: d } : d));
  }, [sparkData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="bg-card text-card-foreground border border-border rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* 1. En-tête : Titre, Valeur Principale, Sous-valeur Monétaire & Icône */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
              {value}
            </span>
          </div>
          {subValue && (
            <span className="text-[11px] font-mono font-medium text-primary tracking-tight">
              {subValue}
            </span>
          )}
        </div>

        <div className={cn("p-2.5 rounded-xl shrink-0 shadow-2xs", iconBg)}>
          {icon}
        </div>
      </div>

      {/* 2. Sparkline Graphique Miniature */}
      <div className="h-10 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={sparkColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-popover border border-border text-[10px] font-mono px-2 py-0.5 rounded-lg shadow-xl text-popover-foreground font-bold">
                    {Number(payload[0].value).toLocaleString("fr-FR")}
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={sparkColor}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Tendance % et Libellé */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 text-xs font-mono">
        <span
          className={cn(
            "flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 border",
            positive
              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
              : "text-rose-600 bg-rose-500/10 border-rose-500/20"
          )}
        >
          {positive ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5" />
          )}
          {positive ? "+" : ""}{trend}%
        </span>
        <span className="text-[10px] text-muted-foreground font-sans font-light truncate">
          {trendLabel}
        </span>
      </div>
    </motion.div>
  );
}