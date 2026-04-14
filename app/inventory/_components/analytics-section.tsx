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
  Sector,
} from "recharts";
import { useState } from "react";
import { SHOP_DISTRIBUTION, STOCK_SERIES_30D } from "../_lib/mock-data";

// Shorten date labels
const chartData = STOCK_SERIES_30D.map((d) => ({
  ...d,
  label: d.date.slice(5), // MM-DD
}));

// Heatmap data: 7 days x 4 weeks
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = ["W1", "W2", "W3", "W4"];
const heatmapData = WEEKS.flatMap((week, wi) =>
  DAYS.map((day, di) => ({
    week,
    day,
    value: Math.floor(Math.random() * 200 + (di < 5 ? 60 : 10)),
    key: `${wi}-${di}`,
  }))
);

function heatColor(v: number) {
  if (v > 200) return "bg-indigo-600 dark:bg-indigo-500";
  if (v > 150) return "bg-indigo-400 dark:bg-indigo-600";
  if (v > 100) return "bg-indigo-300 dark:bg-indigo-700";
  if (v > 60) return "bg-indigo-200 dark:bg-indigo-800";
  return "bg-indigo-100 dark:bg-indigo-950";
}

type ActiveShapeProps = {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
  payload: { name: string }; percent: number; value: number;
};

// Active pie shape
function renderActiveShape(props: unknown) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props as ActiveShapeProps;
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill={fill} className="text-sm font-semibold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={fill} className="text-xs">
        {value.toLocaleString()} ({(percent * 100).toFixed(1)}%)
      </text>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
      />
      <Sector
        cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 14}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
      />
    </g>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--foreground)",
  fontSize: "12px",
};

export default function AnalyticsSection() {
  const [activePieIndex, setActivePieIndex] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      {/* Bar chart: Incoming vs Outgoing */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Incoming vs Outgoing
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Daily stock flow over 30 days</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="incoming" name="Incoming" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="outgoing" name="Outgoing" fill="#f43f5e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart: Cumulative evolution */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Stock Evolution
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Cumulative stock level over time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart: Distribution by shop */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Stock Distribution by Shop
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Current stock share per location</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
            //   activeIndex={activePieIndex}
              activeShape={renderActiveShape as React.ComponentProps<typeof Pie>["activeShape"]}
              data={SHOP_DISTRIBUTION}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              dataKey="value"
              onMouseEnter={(_, index) => setActivePieIndex(index)}
            >
              {SHOP_DISTRIBUTION.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap: Activity by day */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Activity Heatmap
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Units moved per day of week</p>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex gap-2 ml-8">
            {DAYS.map((d) => (
              <div key={d} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
                {d}
              </div>
            ))}
          </div>
          {WEEKS.map((week) => (
            <div key={week} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6 shrink-0">{week}</span>
              <div className="flex gap-2 flex-1">
                {DAYS.map((day) => {
                  const cell = heatmapData.find((d) => d.week === week && d.day === day);
                  return (
                    <div
                      key={day}
                      title={`${cell?.value ?? 0} units`}
                      className={`flex-1 rounded h-8 ${heatColor(cell?.value ?? 0)} cursor-default transition-opacity hover:opacity-80`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {["bg-indigo-100", "bg-indigo-200", "bg-indigo-300", "bg-indigo-400", "bg-indigo-600"].map((c) => (
              <div key={c} className={`w-4 h-4 rounded ${c}`} />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
