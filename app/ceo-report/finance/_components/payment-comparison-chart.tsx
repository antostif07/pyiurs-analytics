// app/ceo-report/finance/_components/payment-comparison-chart.tsx
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
import type { PaymentComparisonRow } from "../_lib/types";

interface PaymentComparisonChartProps {
    rows: PaymentComparisonRow[];
}

export default function PaymentComparisonChart({
    rows,
}: PaymentComparisonChartProps) {
    return (
        <div className="h-[210px] w-full">
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
                        dataKey="category"
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
                        tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: "10px",
                            border: "none",
                            boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
                            fontSize: "11px",
                        }}
                        formatter={(v: any) => [
                            `${Number(v).toLocaleString("fr-FR")} $`,
                        ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar
                        dataKey="invoicedOdoo"
                        name="Facturé Odoo"
                        fill="#64748b"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={22}
                    />
                    <Bar
                        dataKey="paid"
                        name="Décaissement Payé"
                        fill="#10b981"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={22}
                    />
                    <Bar
                        dataKey="remaining"
                        name="Reste à Payer"
                        fill="#f59e0b"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={22}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}