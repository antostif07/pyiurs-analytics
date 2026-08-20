"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StockDashboardFilters } from "../stock-dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Activity, PieChart as PieIcon, Calendar } from "lucide-react";
import { useInventoryAnalytics } from "../_lib/hooks/use-inventory-analytics";

interface AnalyticsSectionProps {
  filters?: StockDashboardFilters;
}

function heatColor(v: number) {
  if (v > 100) return "bg-primary text-primary-foreground font-bold";
  if (v > 50) return "bg-primary/70 text-white";
  if (v > 20) return "bg-primary/40 text-foreground";
  if (v > 0) return "bg-primary/15 text-foreground";
  return "bg-muted/40 text-muted-foreground/40";
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--foreground)",
  fontSize: "11px",
  fontFamily: "monospace",
};

export default function AnalyticsSection({ filters }: AnalyticsSectionProps) {
  // Connexion aux données réelles Odoo via TanStack Query
  const { data, isLoading } = useInventoryAnalytics(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-card border border-border rounded-2xl space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const flowSeries = data?.flowSeries || [];
  const shopDistribution = data?.shopDistribution || [];
  const heatmapData = data?.heatmapData || [];

  const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const WEEKS_LABEL = ["S-3", "S-2", "S-1", "S-0"];

  const totalShopUnits = shopDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      {/* 1. BarChart : Entrées vs Sorties Réelles Odoo */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Flux Entrées vs Sorties
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground font-light mb-4">
          Réceptions centrales (BC) et ventes quotidiennes
        </p>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowSeries} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
              <Bar dataKey="incoming" name="Entrées (BC / Fournisseurs)" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outgoing" name="Sorties (Ventes POS)" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. LineChart : Évolution Cumulative du Stock */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-sky-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Évolution Cumulative du Stock
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground font-light mb-4">
          Solde net des unités disponibles dans le temps
        </p>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flowSeries} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Stock Net"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. PieChart : Répartition par Boutique (Donut Réarchitecturé 100% Type-Safe) */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <PieIcon className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Répartition par Boutique
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground font-light mb-2">
          Part du stock physique par point de vente Odoo
        </p>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={shopDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {shopDistribution.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              {/* Tooltip enrichi avec calcul automatique du pourcentage */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0];
                    const percent = totalShopUnits > 0
                      ? ((Number(item.value) / totalShopUnits) * 100).toFixed(1)
                      : "0";

                    return (
                      <div className="bg-popover border border-border text-xs px-3 py-2 rounded-xl shadow-xl text-popover-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: (item.payload as any)?.color }}
                          />
                          <span className="font-bold">{item.name}</span>
                        </div>
                        <div className="font-mono text-muted-foreground text-[11px] mt-1">
                          {Number(item.value).toLocaleString("fr-FR")} unités ({percent}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Heatmap d'Activité Réelle (4 dernières semaines) */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Intensité des Mouvements (Heatmap)
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground font-light mb-4">
          Unités physiques déplacées par jour (4 dernières semaines)
        </p>

        <div className="flex flex-col gap-2 mt-2">
          <div className="flex gap-1.5 ml-8">
            {DAYS_FR.map((d) => (
              <div key={d} className="flex-1 text-center text-[9px] text-muted-foreground font-mono font-bold">
                {d}
              </div>
            ))}
          </div>

          {WEEKS_LABEL.map((week) => (
            <div key={week} className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-muted-foreground w-6 shrink-0 font-bold">{week}</span>
              <div className="flex gap-1.5 flex-1">
                {DAYS_FR.map((day) => {
                  const cell = heatmapData.find((d) => d.week === week && d.day === day);
                  const count = cell?.value ?? 0;
                  return (
                    <div
                      key={day}
                      title={`${count} unités déplacées`}
                      className={`flex-1 rounded-md h-7 flex items-center justify-center text-[9px] font-mono transition-opacity cursor-default ${heatColor(count)}`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Échelle de chaleur */}
          <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] font-mono text-muted-foreground">
            <span>0</span>
            <div className="w-3 h-3 rounded bg-muted/40" />
            <div className="w-3 h-3 rounded bg-primary/15" />
            <div className="w-3 h-3 rounded bg-primary/40" />
            <div className="w-3 h-3 rounded bg-primary/70" />
            <div className="w-3 h-3 rounded bg-primary" />
            <span>+100 u.</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}