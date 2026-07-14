import * as React from "react";
import { motion } from "framer-motion";

interface KPIData {
  label: string;
  value: string;
  delta?: string;
}

interface KPIStripProps {
  kpis: readonly KPIData[];
}

export const KPIStrip = React.memo(function KPIStrip({ kpis }: KPIStripProps) {
  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card/40 border border-border rounded-xl p-4 shadow-sm backdrop-blur-sm"
        >
          <p className="text-xs uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">{kpi.label}</p>
          <p className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">{kpi.value}</p>
          {kpi.delta && (
            <p className="text-xs text-emerald-500 font-semibold mt-1">{kpi.delta}</p>
          )}
        </div>
      ))}
    </motion.div>
  );
});