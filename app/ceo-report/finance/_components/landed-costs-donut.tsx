// app/ceo-report/finance/_components/landed-costs-donut.tsx
"use client";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { LandedCostRow } from "../_lib/types";

const LANDED_COST_COLORS = ["#6366f1", "#0ea5e9", "#f59e0b"];

interface LandedCostsDonutProps {
    rows: LandedCostRow[];
}

export default function LandedCostsDonut({ rows }: LandedCostsDonutProps) {
    // Recharts exige un type "ChartDataInput" (index signature [key: string]: any).
    // On projette vers un Record<string, unknown> compatible, sans polluer
    // le type partagé LandedCostRow (utilisé aussi côté API/table).
    const chartData: Array<Record<string, unknown>> = rows.map((r) => ({
        label: r.label,
        amount: r.amount,
        percentPo: r.percentPo,
    }));

    return (
        <>
            <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={2}
                            dataKey="amount"
                            nameKey="label"
                        >
                            {chartData.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={
                                        LANDED_COST_COLORS[
                                        i % LANDED_COST_COLORS.length
                                        ]
                                    }
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(v: any) => [
                                `${Number(v).toLocaleString("fr-FR")} $`,
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 mt-2">
                {rows.map((s, i) => (
                    <div
                        key={s.label}
                        className="flex items-center justify-between text-[10px]"
                    >
                        <div className="flex items-center gap-1.5">
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                    background:
                                        LANDED_COST_COLORS[
                                        i % LANDED_COST_COLORS.length
                                        ],
                                }}
                            />
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                                {s.label}
                            </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {s.amount.toLocaleString("fr-FR")} $ (
                            {s.percentPo.toFixed(2).replace(".", ",")} %)
                        </span>
                    </div>
                ))}
            </div>
        </>
    );
}