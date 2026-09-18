"use client";

import { useState } from "react";
import Link from "next/link";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from "recharts";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import KpiCard from "./kpi-card";
import { defaultFilters } from "../_lib/filters";
import ReportPageHeader from "./report-page-header";
import { SectionHeader } from "./report-page-header";
import { ExecutiveCockpitData } from "../_lib/data/executive-cockpit";
import GlobalFilters from "./global-filters";
import { ReportFilter } from "../_lib/types/reports";
import AlertBadge from "./alert-badge";

/* ── Palette alignée sur le thème (oklch vars) ── */
const STORE_COLORS = [
    "var(--chart-1)",
    "var(--chart-4)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-5)",
];

const SEGMENT_COLORS: Record<string, string> = {
    Femme: "var(--chart-4)",
    Kids: "var(--chart-2)",
    Beauty: "var(--chart-3)",
};

const CHART_AXIS = "var(--muted-foreground)";
const CHART_GRID = "var(--border)";
const CHART_NEUTRAL = "var(--muted)";

/* ── Tooltip ── */
const CustomTooltip = ({
    active, payload, label,
}: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-sm shadow-xl px-3.5 py-3 text-[11.5px]">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 py-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-muted-foreground/70">{p.name}</span>
                    <span className="font-semibold ml-auto pl-4">
                        ${p.value.toLocaleString("fr-FR")}
                    </span>
                </div>
            ))}
        </div>
    );
};

type Props = { data: ExecutiveCockpitData };

export default function ExecutiveCockpit({ data }: Props) {
    const [filters, setFilters] = useState<ReportFilter>(defaultFilters);

    const { sales, alerts } = data;

    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const warningAlerts = alerts.filter((a) => a.severity === "warning");
    const infoAlerts = alerts.filter((a) => a.severity === "info");

    const segmentPieData = sales.bySegment.map((s) => ({
        name: s.segment,
        value: s.actual,
        color: SEGMENT_COLORS[s.segment] ?? "var(--muted-foreground)",
    }));

    const totalSegment = segmentPieData.reduce((acc, s) => acc + s.value, 0);

    return (
        <div className="flex flex-col min-h-screen">
            <ReportPageHeader
                title="Executive Cockpit"
                subtitle="Vue consolidée de la performance Pyiurs"
            >
                <GlobalFilters filters={filters} compact />
            </ReportPageHeader>

            <div className="p-6 space-y-8">

                {/* ── KPI Financier ── */}
                <section>
                    <SectionHeader title="Financier" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <KpiCard label="CA Réalisé" value={96000} format="currency" variation={3.56} variationLabel="vs budget" href="/reports/sales" isPositiveUp accentColor="blue" highlight />
                        <KpiCard label="Budget" value={92700} format="currency" href="/reports/sales" />
                        <KpiCard label="Écart Budget" value={3300} format="currency" variation={3.56} variationLabel="du budget" href="/reports/sales" isPositiveUp />
                        <KpiCard label="Valeur Stock" value={106990} format="currency" variation={-0.9} variationLabel="vs mois préc." href="/reports/stock" isPositiveUp={false} />
                        <KpiCard label="Cash" value={30100} format="currency" variation={-0.07} variationLabel="écart caisse" href="/reports/cash" isPositiveUp={false} />
                    </div>
                </section>

                {/* ── KPI Clients ── */}
                <section>
                    <SectionHeader title="Clients" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <KpiCard label="Parc Clients" value={2750} format="number" variation={2.4} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                        <KpiCard label="Gross Adds" value={289} format="number" variation={4.0} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp accentColor="emerald" />
                        <KpiCard label="Churn 30J" value={122} format="number" variation={1.7} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp={false} accentColor="red" />
                        <KpiCard label="Rev. Acquisition" value={24900} format="currency" variation={5.5} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                        <KpiCard label="Rev. Récurrent" value={71100} format="currency" variation={3.2} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                        <KpiCard label="ARPU" value={34.91} format="currency" variation={0.9} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                    </div>
                </section>

                {/* ── Graphiques principaux ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* CA vs Budget */}
                    <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-[13px] font-semibold text-foreground">CA Réel vs Budget</h3>
                                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Évolution mensuelle 2026</p>
                            </div>
                            <Link href="/reports/sales" className="text-[11px] text-primary/70 flex items-center gap-0.5 hover:text-primary transition-colors">
                                Détail <ChevronRight size={11} />
                            </Link>
                        </div>
                        <ResponsiveContainer width="100%" height={195}>
                            <AreaChart data={sales.trend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10.5, fill: CHART_AXIS }} axisLine={false} tickLine={false}
                                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconSize={8} wrapperStyle={{ fontSize: 10.5, color: CHART_AXIS }} />
                                <Area type="monotone" dataKey="actual" name="CA Réel" stroke="var(--chart-1)" fill="url(#gradActual)" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="budget" name="Budget" stroke={CHART_AXIS} fill="none" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Donut segments */}
                    <div className="rounded-xl border border-border/60 bg-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[13px] font-semibold text-foreground">CA par Segment</h3>
                                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Répartition Sep 2026</p>
                            </div>
                            <Link href="/reports/sales" className="text-[11px] text-primary/70 hover:text-primary transition-colors">
                                <ChevronRight size={11} />
                            </Link>
                        </div>
                        <ResponsiveContainer width="100%" height={140}>
                            <PieChart>
                                <Pie data={segmentPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value" strokeWidth={0}>
                                    {segmentPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip
                                    formatter={(value) =>
                                        typeof value === "number" ? `$${value.toLocaleString("fr-FR")}` : value
                                    }
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 mt-1">
                            {segmentPieData.map((s) => (
                                <div key={s.name} className="flex items-center gap-2.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                    <span className="text-[11.5px] text-muted-foreground/70 flex-1">{s.name}</span>
                                    <span className="text-[11.5px] font-semibold tabular-nums">
                                        ${s.value.toLocaleString("fr-FR")}
                                    </span>
                                    <span className="text-[10.5px] text-muted-foreground/40 w-8 text-right">
                                        {totalSegment ? ((s.value / totalSegment) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Boutiques + Matrice ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    <div className="rounded-xl border border-border/60 bg-card p-5">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-[13px] font-semibold">CA par Boutique</h3>
                                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Réel vs Budget</p>
                            </div>
                            <Link href="/reports/sales" className="text-[11px] text-primary/70 flex items-center gap-0.5 hover:text-primary transition-colors">
                                Détail <ChevronRight size={11} />
                            </Link>
                        </div>
                        <ResponsiveContainer width="100%" height={175}>
                            <BarChart data={sales.byStore} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={3} barCategoryGap="25%">
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                                <XAxis dataKey="store" tick={{ fontSize: 10.5, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10.5, fill: CHART_AXIS }} axisLine={false} tickLine={false}
                                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconSize={8} wrapperStyle={{ fontSize: 10.5, color: CHART_AXIS }} />
                                <Bar dataKey="actual" name="CA Réel" radius={[4, 4, 0, 0]}>
                                    {sales.byStore.map((_, i) => (
                                        <Cell key={i} fill={STORE_COLORS[i % STORE_COLORS.length]} />
                                    ))}
                                </Bar>
                                <Bar dataKey="budget" name="Budget" radius={[4, 4, 0, 0]} fill={CHART_NEUTRAL} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[13px] font-semibold">Matrice Boutique × Segment</h3>
                                <p className="text-[11px] text-muted-foreground/50 mt-0.5">CA réalisé ($)</p>
                            </div>
                            <Link href="/reports/sales" className="text-[11px] text-primary/70 flex items-center gap-0.5 hover:text-primary transition-colors">
                                Détail <ChevronRight size={11} />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11.5px]">
                                <thead>
                                    <tr className="border-b border-border/40">
                                        <th className="text-left font-semibold py-2 pr-3 text-muted-foreground/50">Segment</th>
                                        {["P24", "P.MTO", "P.LMB", "P.KTM", "P.ONL"].map((s) => (
                                            <th key={s} className="text-right font-semibold py-2 px-1.5 text-muted-foreground/50">{s}</th>
                                        ))}
                                        <th className="text-right font-semibold py-2 px-1.5 text-muted-foreground/50">Total</th>
                                        <th className="text-right font-semibold py-2 pl-2 text-muted-foreground/50">Écart %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.matrix.map((row) => (
                                        <tr
                                            key={row.segment}
                                            className={cn(
                                                "border-b border-border/20 hover:bg-foreground/[0.02] transition-colors",
                                                row.segment === "Total" && "border-t border-border/50 font-bold"
                                            )}
                                        >
                                            <td className="py-2.5 pr-3 font-medium text-foreground/80">{row.segment}</td>
                                            {(["P24", "P.MTO", "P.LMB", "P.KTM", "P.ONL"] as const).map((s) => (
                                                <td key={s} className="py-2.5 px-1.5 text-right tabular-nums text-foreground/70">
                                                    ${(row[s] / 1000).toFixed(1)}k
                                                </td>
                                            ))}
                                            <td className="py-2.5 px-1.5 text-right tabular-nums font-semibold">
                                                ${(row.total / 1000).toFixed(0)}k
                                            </td>
                                            <td
                                                className="py-2.5 pl-2 text-right tabular-nums font-bold"
                                                style={{ color: row.variancePct >= 0 ? "var(--chart-2)" : "var(--destructive)" }}
                                            >
                                                {row.variancePct >= 0 ? "+" : ""}{row.variancePct.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ── Alertes ── */}
                <section>
                    <SectionHeader
                        title="Points nécessitant une attention"
                        action={
                            <span>
                                {criticalAlerts.length} critique{criticalAlerts.length > 1 ? "s" : ""} ·{" "}
                                {warningAlerts.length} avertissement{warningAlerts.length > 1 ? "s" : ""}
                            </span>
                        }
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {criticalAlerts.map((a) => <AlertBadge key={a.id} {...a} />)}
                        {warningAlerts.map((a) => <AlertBadge key={a.id} {...a} />)}
                        {infoAlerts.map((a) => <AlertBadge key={a.id} {...a} />)}
                    </div>
                </section>

            </div>
        </div>
    );
}