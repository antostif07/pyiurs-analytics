"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  Package,
  Sparkles,
  ArrowLeftRight,
  ShieldCheck
} from "lucide-react";
import { StockDashboardFilters } from "../stock-dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStockInsights } from "../_lib/hooks/use-stock-insights";

const ICONS_MAP = {
  "trending-up": TrendingUp,
  "alert-triangle": AlertTriangle,
  "transfer": ArrowLeftRight,
  "package": Package,
  "sparkles": Sparkles,
};

const COLOR_STYLES = {
  emerald: {
    card: "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40",
    icon: "bg-emerald-500/10 text-emerald-600",
    badge: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  amber: {
    card: "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40",
    icon: "bg-amber-500/10 text-amber-600",
    badge: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  },
  rose: {
    card: "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40",
    icon: "bg-rose-500/10 text-rose-600",
    badge: "text-rose-600 bg-rose-500/10 border-rose-500/20",
  },
  primary: {
    card: "border-primary/20 bg-primary/5 hover:border-primary/40",
    icon: "bg-primary/10 text-primary",
    badge: "text-primary bg-primary/10 border-primary/20",
  },
  sky: {
    card: "border-sky-500/20 bg-sky-500/5 hover:border-sky-500/40",
    icon: "bg-sky-500/10 text-sky-600",
    badge: "text-sky-600 bg-sky-500/10 border-sky-500/20",
  },
};

interface AiInsightsPanelProps {
  filters?: StockDashboardFilters;
}

export default function AiInsightsPanel({ filters }: AiInsightsPanelProps) {
  // ✅ Connexion directe aux recommandations Odoo réelles
  const { data: insights = [], isLoading } = useStockInsights(filters);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="p-3.5 border border-border rounded-xl space-y-2">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="bg-card text-card-foreground border border-border rounded-2xl shadow-xs overflow-hidden transition-colors"
    >
      {/* En-tête */}
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Recommandations Intelligentes
            </h3>
            <p className="text-[10px] text-muted-foreground font-light">
              Générées à partir des flux Odoo et de la vélocité
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
          {insights.length} Recommandations
        </Badge>
      </div>

      {/* Liste des Insights */}
      <div className="p-4 flex flex-col gap-2.5 max-h-[380px] overflow-y-auto scrollbar-thin">
        {insights.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <p className="text-xs font-medium text-foreground">Équilibre de stock parfait</p>
            <p className="text-[10px] font-light text-muted-foreground">Aucun déséquilibre critique ou produit dormant identifié.</p>
          </div>
        ) : (
          insights.map((insight, i) => {
            const Icon = ICONS_MAP[insight.icon] || Sparkles;
            const styles = COLOR_STYLES[insight.color] || COLOR_STYLES.primary;

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className={cn(
                  "flex items-start gap-3 rounded-xl p-3 border transition-all duration-150",
                  styles.card
                )}
              >
                <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", styles.icon)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-foreground truncate">
                      {insight.title}
                    </span>
                    {insight.impactValue && (
                      <Badge variant="outline" className={cn("text-[8px] font-mono font-bold px-1.5 py-0 shrink-0", styles.badge)}>
                        {insight.impactValue}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/90 font-light leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}