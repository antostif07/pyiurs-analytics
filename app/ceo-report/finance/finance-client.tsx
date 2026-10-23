// app/ceo-report/finance/finance-client.tsx
"use client";

import {
    Banknote,
    DollarSign,
    ShieldCheck,
    Percent,
    Loader2,
    Download,
    Receipt,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import PaymentComparisonChart from "./_components/payment-comparison-chart";
import LandedCostsDonut from "./_components/landed-costs-donut";
import PurchaseAuditFinanceTable from "./_components/purchase-audit-finance-table";
import { useFinance } from "./_lib/hooks/use-finance";
import { useExportFinance } from "./_lib/hooks/use-export-finance";

const fmtMoney = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }) + " $";

export default function FinanceAuditClient() {
    const { data, isLoading, error } = useFinance();
    const { exportFinance, isExporting } = useExportFinance();

    const kpis = data?.kpis;
    const paymentComparison = data?.paymentComparison ?? [];
    const landedCosts = data?.landedCosts ?? [];
    const auditRows = data?.auditRows ?? [];

    return (
        <div>
            {/* ══════════════ HEADER ══════════════ */}
            <ReportPageHeader
                title="Audit Comptabilité Achats & Frais Logistiques"
                subtitle="Rapprochement des engagements Odoo, décaissements fournisseurs et frais d'approche"
                badge={{ label: "Finance", tone: "amber" }}
                isLoading={isLoading}
                extraActions={
                    data ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    disabled={isExporting}
                                    className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                                >
                                    {isExporting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Download className="w-3 h-3" />
                                    )}
                                    {isExporting ? "Export…" : "Exporter"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-56 p-1 rounded-lg shadow-xl"
                            >
                                <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                    Format
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportFinance("XLSX")}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportFinance("CSV")}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    CSV (données brutes)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportFinance("PDF")}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    PDF (rapport)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : undefined
                }
            />

            {/* ══════════════ CONTENU ══════════════ */}
            <div className="p-4 sm:p-5 space-y-4">
                {error ? (
                    <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-center text-[11px] text-rose-700 dark:text-rose-400">
                        Erreur :{" "}
                        {error instanceof Error ? error.message : "Inconnue"}
                    </div>
                ) : isLoading ? (
                    <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                        <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
                            Chargement de l'audit comptable…
                        </p>
                    </div>
                ) : !data ? (
                    <EmptyFinance />
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <CeoKpiCard
                                label="Total facturé Odoo"
                                value={fmtMoney(kpis?.invoicedOdoo ?? 0)}
                                subtitle={`Sur ${fmtMoney(kpis?.poCommitted ?? 0)} engagés en PO`}
                                icon={<Banknote className="w-3.5 h-3.5" />}
                                iconColor="text-sky-600 dark:text-sky-400"
                                iconBg="bg-sky-50 dark:bg-sky-950/40"
                            />
                            <CeoKpiCard
                                label="Décaissements payés"
                                value={fmtMoney(kpis?.paid ?? 0)}
                                subtitle={`Reste à payer : ${fmtMoney(kpis?.remainingToPay ?? 0)} (${kpis?.remainingCategory ?? "—"})`}
                                icon={<DollarSign className="w-3.5 h-3.5" />}
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                            />
                            <CeoKpiCard
                                label="Frais d'approche"
                                value={fmtMoney(kpis?.landedCosts ?? 0)}
                                subtitle={`+${(kpis?.landedCostsPercent ?? 0).toFixed(2).replace(".", ",")}% de surcoût sur les achats PO`}
                                icon={<Percent className="w-3.5 h-3.5" />}
                                iconColor="text-violet-600 dark:text-violet-400"
                                iconBg="bg-violet-50 dark:bg-violet-950/40"
                            />
                            <CeoKpiCard
                                label="Économie négociée"
                                value={`-${fmtMoney(kpis?.negotiatedSavings ?? 0)}`}
                                subtitle={`Demande prix (${Math.round((kpis?.priceRequest ?? 0) / 1000)}k$) vs Bon de commande (${Math.round((kpis?.poCommitted ?? 0) / 1000)}k$)`}
                                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                            />
                        </div>

                        {/* Graphiques */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <div className="lg:col-span-2">
                                <ReportSection
                                    index={1}
                                    title="Rapprochement facturation Odoo vs trésorerie décaissée"
                                >
                                    <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-3">
                                        <p className="text-[10px] text-muted-foreground/70 mb-2">
                                            Ventilation des montants facturés et des règlements par catégorie d'achat ($)
                                        </p>
                                        <PaymentComparisonChart
                                            rows={paymentComparison}
                                        />
                                    </div>
                                </ReportSection>
                            </div>

                            <ReportSection
                                index={2}
                                title={`Frais d'approche (${fmtMoney(kpis?.landedCosts ?? 0)})`}
                            >
                                <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-3">
                                    <p className="text-[10px] text-muted-foreground/70 mb-2">
                                        Poids par poste logistique
                                    </p>
                                    <LandedCostsDonut rows={landedCosts} />
                                </div>
                            </ReportSection>
                        </div>

                        {/* Tableau d'audit */}
                        <ReportSection
                            index={3}
                            title="Matrice d'audit achats & frais logistiques"
                        >
                            <PurchaseAuditFinanceTable
                                rows={auditRows}
                                landedCosts={landedCosts}
                                totals={data.auditTotals}
                                landedTotal={data.landedCostsTotal}
                            />
                        </ReportSection>
                    </>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────── */
/* État vide : aucune donnée d'audit disponible                 */
/* ──────────────────────────────────────────────────────────── */

function EmptyFinance() {
    return (
        <div className="rounded-lg border border-border/60 border-dashed bg-card shadow-2xs p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground">
                Aucune donnée d'audit disponible
            </h3>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-md mx-auto">
                Les données comptables et logistiques ne sont pas encore
                disponibles pour cet exercice.
            </p>
        </div>
    );
}