import { motion } from "framer-motion";
import {
  RotateCcw,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react";
import { SHOP_STOCK_DATA } from "../_lib/mock-data";


const totalCurrent = SHOP_STOCK_DATA.reduce((s, r) => s + r.currentStock, 0);
const totalOutgoing = SHOP_STOCK_DATA.reduce((s, r) => s + r.outgoingStock, 0);
const totalOpening = SHOP_STOCK_DATA.reduce((s, r) => s + r.openingStock, 0);
const avgStock = (totalOpening + totalCurrent) / 2;
const turnoverRatio = (totalOutgoing / avgStock).toFixed(2);
const daysRemaining = Math.round(totalCurrent / (totalOutgoing / 30));
const inventoryAccuracy = 97.4;

// Fast vs slow movers (top 50% outgoing = fast)
const sorted = [...SHOP_STOCK_DATA].sort((a, b) => b.outgoingStock - a.outgoingStock);
const fastMovers = sorted.slice(0, Math.ceil(sorted.length / 2));
const slowMovers = sorted.slice(Math.ceil(sorted.length / 2));

const METRICS = [
  {
    icon: RotateCcw,
    label: "Stock Turnover Ratio",
    value: turnoverRatio,
    sub: "Times per period",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950",
  },
  {
    icon: Clock,
    label: "Days of Inventory",
    value: `${daysRemaining}d`,
    sub: "At current velocity",
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-950",
  },
  {
    icon: CheckCircle,
    label: "Inventory Accuracy",
    value: `${inventoryAccuracy}%`,
    sub: "Based on audit logs",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    icon: Zap,
    label: "Fast-Moving Products",
    value: `${fastMovers.length} / ${SHOP_STOCK_DATA.length}`,
    sub: "Top 50% by outgoing",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
  },
];

export default function BusinessMetrics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      className="bg-card border border-border rounded-2xl shadow-sm p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Performance Metrics
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Enterprise-level inventory intelligence
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="flex flex-col gap-3 p-4 rounded-xl bg-muted/40 border border-border"
          >
            <div className={`p-2 rounded-lg w-fit ${m.bg}`}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{m.value}</div>
              <div className="text-xs font-medium text-foreground/80">{m.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fast vs Slow movers */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Fast-Moving Products
          </div>
          {fastMovers.map((p) => (
            <div key={p.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
              <span className="text-foreground">{p.product}</span>
              <span className="text-muted-foreground">{p.outgoingStock} out</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Slow-Moving Products
          </div>
          {slowMovers.map((p) => (
            <div key={p.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
              <span className="text-foreground">{p.product}</span>
              <span className="text-muted-foreground">{p.outgoingStock} out</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
