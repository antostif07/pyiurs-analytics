// executive-cockpit.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from "recharts";
import { ChevronRight } from "lucide-react";
import KpiCard from "./kpi-card";
import { defaultFilters } from "../_lib/filters";
import ReportPageHeader, { SectionHeader } from "./report-page-header";
import { ExecutiveCockpitData } from "../_lib/data/executive-cockpit";
import GlobalFilters from "./global-filters";
import { ReportFilter } from "../_lib/types/reports";
import AlertBadge from "./alert-badge";

// ✅ Import direct du composant existant sous sales (Zéro duplication)
import SalesRevenueMatrixTable from "@/app/ceo-report/sales/_components/sales-revenue-matrix-table";
import { SALES_MATRIX_INITIAL_DATA } from "@/app/ceo-report/sales/_components/data";
import CustomerSegmentationMatrixTable from "../customers/_components/customer-segmentation-matrix-table";
import CustomerMatrixTable from "../customers/_components/customer-matrix-table";
import StockMovementMatrixTable from "../stock/_components/stock-movement-matrix-table";
import PurchaseDispatchMatrixTable from "../operations/_components/purchase-dispatch-matrix-table";
import TransferControlTable from "../operations/_components/transfer-control-table.tsx";
import PurchaseAuditFinanceTable from "../finance/_components/purchase-audit-finance-table";
import StoreStockAuditSizesTable from "../stock/_components/store-stock-audit-sizes-table";
import LeaseHrMatrixTable from "../hr/_components/lease-hr-matrix-table";
import CashOpexMatrixTable from "../cash/_components/cash-opex-matrix-table";

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
        <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-slate-950">
            <ReportPageHeader
                title="Executive Cockpit"
                subtitle="Vue consolidée de la performance Pyiurs"
            >
                <GlobalFilters filters={filters} compact />
            </ReportPageHeader>

            <div className="p-6 space-y-8">

                {/* ── 1. Matrice des Revenus (Composant existant sous sales) ── */}
                <SalesRevenueMatrixTable data={SALES_MATRIX_INITIAL_DATA} />

                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                2. SUIVI CLIENTÈLE, FLUX (GROSS ADDS, CHURN 30J) & SEGMENTATION
                            </h2>
                        </div>
                        {/* Lien direct vers la page dédiée */}
                        <Link
                            href="/ceo-report/customers"
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Analyse détaillée <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* Réutilisation du tableau unique */}
                    <CustomerMatrixTable />
                </section>

                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                3. MOUVEMENTS DE STOCK GLOBAL (CLÔTURE M-1, ACHATS FOURNISSEURS, VENTES & AJUSTEMENTS)
                            </h2>
                        </div>
                        <Link
                            href="/ceo-report/stock"
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Analyse détaillée <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* Réutilisation propre sans duplication */}
                    <StockMovementMatrixTable />
                </section>

                {/* ── 2. KPI Financier ── */}
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

                {/* ── 3. KPI Clients ── */}
                {/* <section>
                    <SectionHeader title="Clients" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <KpiCard label="Parc Clients" value={2750} format="number" variation={2.4} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                        <KpiCard label="Gross Adds" value={289} format="number" variation={4.0} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp accentColor="emerald" />
                        <KpiCard label="Churn 30J" value={122} format="number" variation={1.7} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp={false} accentColor="red" />
                        <KpiCard label="Rev. Acquisition" value={24900} format="currency" variation={5.5} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                        <KpiCard label="Rev. Récurrent" value={71100} format="currency" variation={3.2} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                        <KpiCard label="ARPU" value={34.91} format="currency" variation={0.9} variationLabel="vs mois préc." href="/reports/customers" isPositiveUp />
                    </div>
                </section> */}

                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                4. SUIVI DES ACHATS PO : COMMANDES, RÉCEPTIONS P.BC & TRANSFERTS ENVOYÉS AUX BOUTIQUES
                            </h2>
                        </div>
                        <Link
                            href="/ceo-report/operations/purchases"
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Détail Supply Chain <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <PurchaseDispatchMatrixTable />
                </section>

                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                5. RAPPORT DE CONTRÔLE DES TRANSFERTS MENSUELS & VALIDATION CODES-BARRES
                            </h2>
                        </div>
                        <Link
                            href="/ceo-report/operations/transfers"
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Audit Logistique <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <TransferControlTable />
                </section>

                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                6. AUDIT COMPTABILITÉ ACHATS & FRAIS LOGISTIQUES SUR ACHATS
                            </h2>
                        </div>
                        <Link
                            href="/ceo-report/finance"
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Synthèse Trésorerie & Frais <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <PurchaseAuditFinanceTable />
                </section>

                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                7. TRÉSORERIE CASH PAR POINT DE VENTE & CLASSIFICATION DES DÉPENSES (OPEX)
                            </h2>
                        </div>
                        <Link href="/ceo-report/cash" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            Détail Cash <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <CashOpexMatrixTable />
                </section>

                {/* ── POINT 8 : VALORISATION STOCK & TAILLES FEMME ── */}
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                8. VALORISATION DU STOCK PAR BOUTIQUE (AVEC AUDITS) & SUIVI DES TAILLES FEMME
                            </h2>
                        </div>
                        <Link href="/ceo-report/stock" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            Audit Stock & Tailles <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <StoreStockAuditSizesTable />
                </section>

                {/* ── POINT 9 : IMMOBILIER (LOYERS) & TABLEAU RH ── */}
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                9. SUIVI IMMOBILIER (LOYERS), FISCALITÉ LOCATIVE & TABLEAU RH
                            </h2>
                        </div>
                        <Link href="/ceo-report/hr" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            Détail Loyers & RH <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <LeaseHrMatrixTable />
                </section>

                {/* ── 5. Alertes ── */}
                {/* <section>
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
                </section> */}

            </div>
        </div>
    );
}