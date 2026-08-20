"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  PackageX,
  RefreshCw,
  Boxes,
  ShieldCheck,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockDashboardFilters } from "../stock-dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockAlerts } from "../_lib/hooks/use-stock-alerts";

interface AlertsPanelProps {
  filters?: StockDashboardFilters;
}

const SEVERITY_STYLES = {
  critical: {
    card: "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40",
    icon: "bg-rose-500/10 text-rose-600",
    badge: "text-rose-600 bg-rose-500/10 border-rose-500/20",
    label: "Rupture Critique",
  },
  warning: {
    card: "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40",
    icon: "bg-amber-500/10 text-amber-600",
    badge: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    label: "Stock Faible",
  },
  info: {
    card: "border-primary/20 bg-primary/5 hover:border-primary/40",
    icon: "bg-primary/10 text-primary",
    badge: "text-primary bg-primary/10 border-primary/20",
    label: "Surstock",
  },
};

export default function AlertsPanel({ filters }: AlertsPanelProps) {
  // ✅ Connexion directe aux alertes réelles Odoo
  const { data: alerts = [], isLoading, refetch, isRefetching } = useStockAlerts(filters);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3.5 border border-border rounded-xl space-y-2">
            <Skeleton className="h-3 w-40" />
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
      transition={{ duration: 0.3 }}
      className="bg-card text-card-foreground border border-border rounded-2xl shadow-xs overflow-hidden transition-colors"
    >
      {/* 1. EN-TÊTE DU PANNEAU D'ALERTES */}
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Alertes de Stock Odoo
            </h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-light mt-0.5">
            {criticalCount} rupture{criticalCount > 1 ? "s" : ""} critique{criticalCount > 1 ? "s" : ""}, {warningCount} stock{warningCount > 1 ? "s" : ""} faible{warningCount > 1 ? "s" : ""}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            refetch();
            toast.success("Vérification des alertes Odoo...");
          }}
          disabled={isRefetching}
          className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1.5 cursor-pointer font-medium"
        >
          <RefreshCw className={cn("w-3 h-3", isRefetching && "animate-spin")} />
          <span>Actualiser</span>
        </Button>
      </div>

      {/* 2. LISTE DES ALERTES */}
      <div className="p-4 flex flex-col gap-2.5 max-h-[380px] overflow-y-auto scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-foreground">Tous les stocks sont optimaux</p>
            <p className="text-[10px] font-light text-muted-foreground">Aucune rupture ni surstock critique détecté sur ce périmètre.</p>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const styles = SEVERITY_STYLES[alert.severity];

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className={cn(
                  "flex items-start gap-3 rounded-xl p-3 border transition-all duration-150",
                  styles.card
                )}
              >
                <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", styles.icon)}>
                  {alert.severity === "critical" ? (
                    <PackageX className="w-3.5 h-3.5" />
                  ) : alert.severity === "warning" ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Boxes className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[11px] font-bold text-foreground truncate">
                        {alert.productName}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn("text-[8px] font-bold uppercase px-1.5 py-0 shrink-0 font-mono", styles.badge)}>
                      {styles.label}
                    </Badge>
                  </div>

                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mb-1">
                    <span>{alert.shopName}</span>
                    <span>•</span>
                    <span>Stock: <strong className="text-foreground font-bold">{alert.currentStock}</strong></span>
                  </div>

                  <p className="text-[10px] text-muted-foreground/90 font-light leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                {/* Bouton d'Action Recommandée */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[10px] h-7 px-2 shrink-0 cursor-pointer font-bold text-primary hover:bg-primary/10"
                  onClick={() => {
                    if (alert.recommendedAction === "restock") {
                      toast.info(`Demande de transfert depuis PB-BC initiée pour ${alert.productName}`);
                    } else {
                      toast.info(`Détail du produit ${alert.productName} affiché`);
                    }
                  }}
                >
                  {alert.recommendedAction === "restock" ? "Réappro." : "Transférer"}
                  <ArrowRight className="w-2.5 h-2.5 ml-1" />
                </Button>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}