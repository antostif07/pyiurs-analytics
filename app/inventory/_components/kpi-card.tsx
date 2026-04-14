import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";

type SparklinePoint = { v: number };

type KpiCardProps = {
  title: string;
  value: string;
  trend: number; // percentage vs previous period
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  sparkData: SparklinePoint[];
  sparkColor: string;
  index: number;
};

export default function KpiCard({
  title,
  value,
  trend,
  trendLabel = "vs last period",
  icon,
  iconBg,
  sparkData,
  sparkColor,
  index,
}: KpiCardProps) {
  const positive = trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
      className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {value}
          </span>
        </div>
        <div className={cn("p-2.5 rounded-xl", iconBg)}>{icon}</div>
      </div>

      {/* Sparkline */}
      <div className="h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${sparkColor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={sparkColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-popover border border-border text-xs px-2 py-1 rounded-lg shadow-md text-foreground">
                    {payload[0].value}
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={sparkColor}
              strokeWidth={1.5}
              fill={`url(#grad-${sparkColor})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5",
            positive
              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400"
              : "text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {positive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(trend)}%
        </span>
        <span className="text-xs text-muted-foreground">{trendLabel}</span>
      </div>
    </motion.div>
  );
}
