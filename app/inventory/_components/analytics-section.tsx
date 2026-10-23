// app/inventory/_components/analytics-section.tsx
"use client";

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
import {
  Activity,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInventoryAnalytics } from "../_lib/hooks/use-inventory-analytics";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
  fontSize: "11px",
  fontFamily: "monospace",
  boxShadow: "0 8px 16px rgb(0 0 0 / 0.08)",
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKS_LABEL = ["S-3", "S-2", "S-1", "S-0"];

function heatColor(v: number) {
  if (v > 100) return "bg-violet-600 text-white font-semibold";
  if (v > 50) return "bg-violet-500/70 text-white";
  if (v > 20) return "bg-violet-500/40 text-foreground";
  if (v > 0) return "bg-violet-500/15 text-foreground";
  return "bg-muted/40 text-muted-foreground/40";
}

export default function AnalyticsSection() {
  const { data, isLoading } = useInventoryAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3 bg-card border border-border/60 rounded-lg space-y-2"
          >
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-2.5 w-48" />
            <Skeleton className="h-[200px] w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  const flowSeries = data?.flowSeries ?? [];
  const shopDistribution = data?.shopDistribution ?? [];
  const heatmapData = data?.heatmapData ?? [];

  const totalShopUnits = shopDistribution.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* 1. BarChart : Entrées vs Sorties */}
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-2xs">
        <div className="flex items-center gap-2 mb-0.5">
          <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Flux entrées vs sorties
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mb-2">
          Réceptions centrales et ventes quotidiennes
        </p>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={flowSeries}
              margin={{ top: 5, right: 5, bottom: 0, left: -25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 9,
                  fill: "var(--muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 9,
                  fill: "var(--muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{
                  fontSize: "10px",
                  paddingTop: "8px",
                }}
              />
              <Bar
                dataKey="incoming"
                name="Entrées"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="outgoing"
                name="Sorties"
                fill="var(--chart-5)"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. LineChart : Évolution cumulative */}
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-2xs">
        <div className="flex items-center gap-2 mb-0.5">
          <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Évolution cumulative du stock
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mb-2">
          Solde net des unités dans le temps
        </p>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={flowSeries}
              margin={{ top: 5, right: 5, bottom: 0, left: -25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 9,
                  fill: "var(--muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 9,
                  fill: "var(--muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Stock net"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. PieChart : Répartition par boutique */}
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-2xs">
        <div className="flex items-center gap-2 mb-0.5">
          <PieIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Répartition par boutique
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mb-2">
          Part du stock physique par point de vente
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
              <Tooltip
                content={({ active, payload }) => {
                  if (
                    !active ||
                    !payload ||
                    !payload.length
                  )
                    return null;
                  const item = payload[0];
                  const percent =
                    totalShopUnits > 0
                      ? (
                        (Number(item.value) /
                          totalShopUnits) *
                        100
                      ).toFixed(1)
                      : "0";
                  const color = (
                    item.payload as
                    | { color?: string }
                    | undefined
                  )?.color;

                  return (
                    <div className="bg-popover border border-border text-[11px] px-2.5 py-1.5 rounded-md shadow-lg text-popover-foreground">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              color,
                          }}
                        />
                        <span className="font-semibold">
                          {item.name}
                        </span>
                      </div>
                      <div className="font-mono text-muted-foreground text-[10px] mt-0.5">
                        {Number(item.value).toLocaleString(
                          "fr-FR",
                        )}{" "}
                        unités ({percent}%)
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Heatmap */}
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-2xs">
        <div className="flex items-center gap-2 mb-0.5">
          <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Intensité des mouvements
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mb-3">
          Unités déplacées par jour (4 dernières semaines)
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5 ml-7">
            {DAYS_FR.map((d) => (
              <div
                key={d}
                className="flex-1 text-center text-[9px] text-muted-foreground font-mono font-semibold"
              >
                {d}
              </div>
            ))}
          </div>

          {WEEKS_LABEL.map((week) => (
            <div key={week} className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-muted-foreground w-5 shrink-0 font-semibold">
                {week}
              </span>
              <div className="flex gap-1.5 flex-1">
                {DAYS_FR.map((day) => {
                  const cell = heatmapData.find(
                    (d) =>
                      d.week === week &&
                      d.day === day,
                  );
                  const count = cell?.value ?? 0;
                  return (
                    <div
                      key={day}
                      title={`${count} unités déplacées`}
                      className={cn(
                        "flex-1 rounded h-7 flex items-center justify-center text-[9px] font-mono transition-opacity cursor-default",
                        heatColor(count),
                      )}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-mono text-muted-foreground">
            <span>0</span>
            <div className="w-3 h-3 rounded bg-muted/40" />
            <div className="w-3 h-3 rounded bg-violet-500/15" />
            <div className="w-3 h-3 rounded bg-violet-500/40" />
            <div className="w-3 h-3 rounded bg-violet-500/70" />
            <div className="w-3 h-3 rounded bg-violet-600" />
            <span>+100</span>
          </div>
        </div>
      </div>
    </div>
  );
}