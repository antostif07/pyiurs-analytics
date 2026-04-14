import { motion } from "framer-motion";
import {
  AlertTriangle,
  PackageX,
  Activity,
  MoveHorizontal,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ALERTS } from "../_lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ALERT_ICONS = {
  low: AlertTriangle,
  overstock: PackageX,
  unusual: Activity,
  inactive: MoveHorizontal,
};

const SEVERITY_STYLES = {
  critical: {
    card: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/40",
    icon: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
    badge: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40",
    icon: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
    badge: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900",
  },
  info: {
    card: "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/40",
    icon: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    badge: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900",
  },
};

export default function AlertsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Smart Alerts</h3>
          <p className="text-xs text-muted-foreground">
            {ALERTS.filter((a) => a.severity === "critical").length} critical,{" "}
            {ALERTS.filter((a) => a.severity === "warning").length} warnings
          </p>
        </div>
        <button
          onClick={() => toast.info("All alerts acknowledged")}
          className="text-xs text-primary cursor-pointer hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {ALERTS.map((alert, i) => {
          const Icon = ALERT_ICONS[alert.type];
          const styles = SEVERITY_STYLES[alert.severity];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={cn(
                "flex items-start gap-3 rounded-xl p-3.5 border",
                styles.card
              )}
            >
              <div className={cn("p-1.5 rounded-lg shrink-0", styles.icon)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{alert.shop}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", styles.badge)}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success(`Action taken for ${alert.product}`);
                }}
              >
                {alert.type === "low" ? "Restock" : "View"}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
