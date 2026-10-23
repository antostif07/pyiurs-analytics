// app/ceo-report/hr/_components/payroll-bar-chart.tsx
"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import type { PayrollRow } from "../_lib/types";

interface PayrollBarChartProps {
    rows: PayrollRow[];
}

export default function PayrollBarChart({ rows }: PayrollBarChartProps) {
    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-3">
            <p className="text-[10px] text-muted-foreground/70 mb-2">
                Répartition Base Fixe vs Primes & Avantages Sociaux ($)
            </p>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                        />
                        <XAxis
                            dataKey="team"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                                fontSize: 10,
                                fill: "#64748b",
                                fontWeight: "bold",
                            }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                            tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: "10px",
                                fontSize: "11px",
                            }}
                            formatter={(v: any) => [
                                `${Number(v).toLocaleString("fr-FR")} $`,
                            ]}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar
                            dataKey="baseSalary"
                            name="Salaire Base"
                            fill="#6366f1"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={26}
                        />
                        <Bar
                            dataKey="perks"
                            name="Avantages"
                            fill="#10b981"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={26}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}