// app/revenue/arpu/_components/analytics-section.tsx
"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

interface ArpuAnalyticsProps {
  chartData: {
    date: string;
    displayDate: string;
    revenue: number;
    arpu: number;
  }[];
  segmentsMix: Record<string, { revenue: number; percent: number }>;
}

const CHART_AXIS_COLOR = "var(--muted-foreground)";
const CHART_GRID_COLOR = "var(--border)";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  boxShadow: "0 8px 16px rgb(0 0 0 / 0.08)",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "var(--popover-foreground)",
};

const fmtMoney = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " $";

const fmtMoneyCompact = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const SEGMENT_COLORS: Record<string, string> = {
  Femme: "var(--chart-4)",
  Beauty: "var(--chart-1)",
  Enfant: "var(--chart-2)",
};

const TIME_CHART_HEIGHT = 280;
const SEGMENT_CHART_HEIGHT = 200;

export default function ArpuAnalytics({
  chartData = [],
  segmentsMix = {},
}: ArpuAnalyticsProps) {
  const segmentPerformanceData = Object.entries(segmentsMix)
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      percent: data.percent,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* ═══════════ 1. ComposedChart : Revenue + ARPU ═══════════ */}
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-2xs w-full">
        <div className="mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Analyse temporelle
          </h3>
          <p className="text-[10px] text-muted-foreground/70">
            Revenu et ARPU sur la période
          </p>
        </div>

        {chartData.length === 0 ? (
          <div
            className="flex items-center justify-center w-full"
            style={{
              height: TIME_CHART_HEIGHT,
              minHeight: TIME_CHART_HEIGHT,
            }}
          >
            <p className="text-[11px] text-muted-foreground/60 italic">
              Aucune donnée sur la période sélectionnée.
            </p>
          </div>
        ) : (
          <div
            className="w-full"
            style={{
              height: TIME_CHART_HEIGHT,
              minHeight: TIME_CHART_HEIGHT,
            }}
          >
            <ResponsiveContainer
              width="100%"
              height={TIME_CHART_HEIGHT}
            >
              <ComposedChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 10,
                  left: -15,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={CHART_GRID_COLOR}
                />

                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: CHART_AXIS_COLOR,
                  }}
                  dy={6}
                />

                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: CHART_AXIS_COLOR,
                  }}
                  tickFormatter={(v: number) =>
                    fmtMoneyCompact(v)
                  }
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: CHART_AXIS_COLOR,
                  }}
                  tickFormatter={(v: number) =>
                    `${v.toFixed(0)}$`
                  }
                />

                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{
                    fill: "var(--muted)",
                    opacity: 0.3,
                  }}
                  labelFormatter={(label) =>
                    `Période : ${label}`
                  }
                  formatter={(value, name) => {
                    const v = Number(value ?? 0);
                    if (name === "Revenu ($)") {
                      return [fmtMoney(v), name];
                    }
                    if (name === "ARPU ($)") {
                      return [`${v.toFixed(2)} $`, name];
                    }
                    return [v, name];
                  }}
                />

                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Revenu ($)"
                  fill="var(--chart-1)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="arpu"
                  name="ARPU ($)"
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--chart-5)" }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══════════ 2. BarChart horizontal : Performance segments ═══════════ */}
      <div className="bg-card border border-border/60 rounded-lg p-3 shadow-2xs w-full">
        <div className="mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Performance par segment
          </h3>
          <p className="text-[10px] text-muted-foreground/70">
            CA total généré par segment sur la période
          </p>
        </div>

        {segmentPerformanceData.length === 0 ? (
          <div
            className="flex items-center justify-center w-full"
            style={{
              height: SEGMENT_CHART_HEIGHT,
              minHeight: SEGMENT_CHART_HEIGHT,
            }}
          >
            <p className="text-[11px] text-muted-foreground/60 italic">
              Aucune donnée de segment disponible.
            </p>
          </div>
        ) : (
          <div
            className="w-full"
            style={{
              height: SEGMENT_CHART_HEIGHT,
              minHeight: SEGMENT_CHART_HEIGHT,
            }}
          >
            <ResponsiveContainer
              width="100%"
              height={SEGMENT_CHART_HEIGHT}
            >
              <BarChart
                data={segmentPerformanceData}
                layout="vertical"
                margin={{ left: 10, right: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal
                  vertical={false}
                  stroke={CHART_GRID_COLOR}
                />

                <XAxis type="number" hide />

                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--foreground)",
                    fontWeight: 600,
                  }}
                  width={70}
                />

                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [
                    fmtMoney(Number(value ?? 0)),
                    "Revenu",
                  ]}
                />

                <Bar
                  dataKey="revenue"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  label={{
                    position: "right",
                    fontSize: 10,
                    fill: CHART_AXIS_COLOR,
                    formatter: (v: unknown) =>
                      fmtMoney(Number(v ?? 0)),
                  }}
                >
                  {segmentPerformanceData.map(
                    (entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={
                          SEGMENT_COLORS[
                          entry.name
                          ] ??
                          `var(--chart-${(idx % 5) + 1})`
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}