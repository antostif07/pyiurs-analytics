"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line
} from "recharts";
import { motion } from "framer-motion";

interface ArpuAnalyticsProps {
  chartData: {
    date: string;
    displayDate: string;
    revenue: number;
    arpu: number;
  }[];
  segmentsMix: Record<string, { revenue: number; percent: number }>;
}

export default function ArpuAnalytics({
  chartData = [],
  segmentsMix = {}
}: ArpuAnalyticsProps) {

  const segmentPerformanceData = Object.entries(segmentsMix)
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      percent: data.percent
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 gap-8"
    >
      {/* ===================== CHART ===================== */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Analyse Hebdomadaire
          </h3>
          <p className="text-sm text-slate-500">
            Revenu et ARPU par cohorte de clients
          </p>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />

              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                dy={10}
              />

              {/* Revenue */}
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />

              {/* ARPU */}
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(v) => `${v.toFixed(0)}$`}
              />

              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.08)"
                }}
                labelFormatter={(label) => `Période : ${label}`}
                formatter={(value: any, name: string | undefined) => {
                  if (name === "Revenu ($)") {
                    return [`${value.toFixed(0)} $`, name];
                  }
                  if (name === "ARPU ($)") {
                    return [`${value.toFixed(2)} $`, name];
                  }
                  return value;
                }}
              />

              <Bar
                yAxisId="left"
                dataKey="revenue"
                name="Revenu ($)"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="arpu"
                name="ARPU ($)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================== SEGMENTS ===================== */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
          Performance par Segment
        </h3>

        <div className="h-[300px]">
          <ResponsiveContainer>
            <BarChart
              data={segmentPerformanceData}
              layout="vertical"
              margin={{ left: 20, right: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal
                vertical={false}
                stroke="#f1f5f9"
              />

              <XAxis type="number" hide />

              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontWeight: "bold" }}
              />

              <Tooltip
                formatter={(v: any) =>
                  typeof v === "number"
                    ? `${(v / 1000).toFixed(1)}k $`
                    : v
                }
              />

              <Bar
                dataKey="revenue"
                fill="#8b5cf6"
                radius={[0, 10, 10, 0]}
                barSize={28}
                label={{
                  position: "right",
                  formatter: (v: any) =>
                    typeof v === "number"
                      ? `${(v / 1000).toFixed(1)}k $`
                      : ""
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}