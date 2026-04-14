import { motion } from "framer-motion";
import {
  TrendingUp,
  Store,
  AlertTriangle,
  Package,
} from "lucide-react";
import { AI_INSIGHTS } from "../_lib/mock-data";
import { cn } from "@/lib/utils";

const ICONS = {
  "trending-up": TrendingUp,
  "store": Store,
  "alert-triangle": AlertTriangle,
  "package": Package,
};

const COLOR_STYLES = {
  green: {
    card: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    icon: "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  blue: {
    card: "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30",
    icon: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  red: {
    card: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
    icon: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  yellow: {
    card: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30",
    icon: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

export default function AiInsightsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-xs">AI</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
          <p className="text-xs text-muted-foreground">Generated from your inventory data</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {AI_INSIGHTS.map((insight, i) => {
          const Icon = ICONS[insight.icon as keyof typeof ICONS] ?? TrendingUp;
          const styles = COLOR_STYLES[insight.color as keyof typeof COLOR_STYLES];
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className={cn(
                "flex items-start gap-3 rounded-xl p-3.5 border",
                styles.card
              )}
            >
              <div className={cn("p-1.5 rounded-lg shrink-0", styles.icon)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{insight.text}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
