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

// ✅ Import direct des composants tableaux
import SalesRevenueMatrixTable from "@/app/ceo-report/sales/_components/sales-revenue-matrix-table";
import CustomerMatrixTable from "../customers/_components/customer-matrix-table";
import StockMovementMatrixTable from "../stock/_components/stock-movement-matrix-table";
import PurchaseAuditFinanceTable from "../finance/_components/purchase-audit-finance-table";
import StoreStockAuditSizesTable from "../stock/_components/store-stock-audit-sizes-table";
import LeaseHrMatrixTable from "../hr/_components/lease-hr-matrix-table";
import CashOpexMatrixTable from "../cash/_components/cash-opex-matrix-table";

// ✅ Hook TanStack Query branché sur Odoo pour le Stock
import { useStockKpis } from "../stock/_lib/hooks/use-stock-kpis";
import TransferControlTable from "../operations/_components/transfer-control-table.tsx";
import { useSalesMatrix } from "../sales/_lib/use-sales-matrix";
import { useCustomerSegmentation } from "../customers/_lib/hooks/use-customer-segmentation";
import { usePurchaseDispatch } from "../operations/purchases/_lib/hooks/use-purchase-dispatch";
import PurchaseDispatchMatrixTable from "../operations/purchases/_components/purchase-dispatch-matrix-table";

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
    const { data: salesData, isLoading: isSalesLoading } = useSalesMatrix();
    const { data: customerData, isLoading: isCustomerLoading } = useCustomerSegmentation();
    const { data: purchaseData, isLoading: isPurchaseLoading } = usePurchaseDispatch();
    const [filters, setFilters] = useState<ReportFilter>(defaultFilters);
    const { sales, alerts } = data;

    // ── Vraies Données Odoo pour le Stock (Tableaux 3 et 8 + Valeur Stock) ──
    const { data: stockData, isLoading: isStockLoading } = useStockKpis();

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

                <SalesRevenueMatrixTable
                    data={salesData}
                    isLoading={isSalesLoading}
                />

                {/* ── 2. Suivi Clientèle & Segmentation ── */}
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                2. SUIVI CLIENTÈLE, FLUX (GROSS ADDS, CHURN 30J) & SEGMENTATION
                            </h2>
                        </div>
                        <Link
                            href="/ceo-report/customers"
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        >
                            Analyse détaillée <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <CustomerMatrixTable
                        data={customerData?.rows}
                        isLoading={isCustomerLoading}
                    />
                </section>

                {/* ── 3. Mouvements de Stock Globaux (Branché Données Réelles Odoo) ── */}
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

                    {/* ✅ Données réelles Odoo réconciliées avec Skeletons */}
                    <StockMovementMatrixTable
                        data={stockData?.movementsData}
                        isLoading={isStockLoading}
                    />
                </section>

                {/* ── 2. KPI Financier ── */}
                {/* <section>
                    <SectionHeader title="Financier" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <KpiCard label="CA Réalisé" value={96000} format="currency" variation={3.56} variationLabel="vs budget" href="/reports/sales" isPositiveUp accentColor="blue" highlight />
                        <KpiCard label="Budget" value={92700} format="currency" href="/reports/sales" />
                        <KpiCard label="Écart Budget" value={3300} format="currency" variation={3.56} variationLabel="du budget" href="/reports/sales" isPositiveUp />
                        <KpiCard
                            label="Valeur Stock"
                            value={stockData ? stockData.totalValuation : 0}
                            format="currency"
                            variation={-0.9}
                            variationLabel="vs mois préc."
                            href="/ceo-report/stock"
                            isPositiveUp={false}
                        />
                        <KpiCard label="Cash" value={30100} format="currency" variation={-0.07} variationLabel="écart caisse" href="/reports/cash" isPositiveUp={false} />
                    </div>
                </section> */}

                {/* ── 4. Suivi des Achats PO & Dispatch ── */}
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

                    <PurchaseDispatchMatrixTable
                        data={purchaseData?.tableRows}
                        isLoading={isPurchaseLoading}
                    />
                </section>

                {/* ── 5. Contrôle des Transferts TR ── */}
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

                {/* ── 6. Audit Comptabilité Achats & Frais Approche ── */}
                <section className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-xs md:text-sm font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                6. AUDIT COMPTABILITÉ ACHATS (FIDÈLE / ODOO) & FRAIS LOGISTIQUES SUR ACHATS
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

                {/* ── 7. Trésorerie Cash & OPEX ── */}
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

                {/* ── 8. Valorisation Stock & Tailles Femme (Branché Données Réelles Odoo) ── */}
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

                    {/* ✅ Données réelles Odoo pour les 5 boutiques et la grille de tailles */}
                    <StoreStockAuditSizesTable
                        data={stockData?.storeStockAuditSizesData}
                        isLoading={isStockLoading}
                    />
                </section>

                {/* ── 9. Immobilier (Loyers) & Tableau RH ── */}
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

            </div>
        </div>
    );
}