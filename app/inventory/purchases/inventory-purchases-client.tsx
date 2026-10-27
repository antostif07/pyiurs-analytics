// app/inventory/purchases/inventory-purchases-client.tsx
"use client";

import Link from "next/link";
import {
    AlertTriangle,
    Boxes,
    Download,
    FileSpreadsheet,
    Loader2,
    PackageCheck,
    Truck,
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

import PurchasesFilters from "./_components/purchases-filters";
import PurchasesTable from "./_components/purchases-table";
import PurchasesInsights from "./_components/purchases-insights";
import { useExportPurchases } from "./_lib/hooks/use-export-purchases";
import type {
    IncomingReceipt,
    PurchaseInsight,
    PurchasesKpis,
} from "./_lib/types";

interface Props {
    receipts: IncomingReceipt[];
    kpis: PurchasesKpis;
    insights: PurchaseInsight[];
    currentStatus: string | null;
    currentStartDate: string | null;
    currentEndDate: string | null;
}

export default function InventoryPurchasesClient({
    receipts,
    kpis,
    insights,
    currentStatus,
    currentStartDate,
    currentEndDate,
}: Props) {
    const { exportCsv, isExporting } = useExportPurchases();

    return (
        <div>
            <ReportPageHeader
                title="Réceptions d'achats"
                subtitle="Suivi des entrées entrepôt et réceptions fournisseurs"
                badge={{ label: "Achats", tone: "sky" }}
                extraActions={
                    <>
                        <Link
                            href="/inventory/purchases/import-generator"
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] rounded-md border border-border/80 bg-background hover:bg-accent/60 font-medium"
                        >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span className="hidden sm:inline">
                                Générer import
                            </span>
                        </Link>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    disabled={isExporting || receipts.length === 0}
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
                                className="w-44 p-1 rounded-lg shadow-xl"
                            >
                                <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                    Format
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportCsv(receipts)}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    CSV (.csv)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            >
                <PurchasesFilters
                    currentStatus={currentStatus}
                    currentStartDate={currentStartDate}
                    currentEndDate={currentEndDate}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Réceptions en attente"
                        value={String(kpis.pending)}
                        subtitle="Prêtes pour déchargement"
                        icon={<Truck className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Retards de livraison"
                        value={String(kpis.late)}
                        subtitle="Pénalités applicables"
                        icon={<AlertTriangle className="w-3.5 h-3.5" />}
                        iconColor={
                            kpis.late > 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                        }
                        iconBg={
                            kpis.late > 0
                                ? "bg-rose-50 dark:bg-rose-950/40"
                                : "bg-emerald-50 dark:bg-emerald-950/40"
                        }
                    />
                    <CeoKpiCard
                        label="Réceptions validées"
                        value={String(kpis.done)}
                        subtitle="Mises en stock effectives"
                        icon={<PackageCheck className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Taux d'entrée"
                        value={`${kpis.receptionRate}%`}
                        subtitle="Rendement de réception"
                        icon={<Boxes className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                </div>

                <ReportSection
                    index={1}
                    title={`Bons de réception · ${receipts.length} entrée${receipts.length > 1 ? "s" : ""}`}
                >
                    <PurchasesTable rows={receipts} />
                </ReportSection>

                <ReportSection
                    index={2}
                    title="Recommandations logistiques & anomalies"
                >
                    <PurchasesInsights insights={insights} />
                </ReportSection>
            </div>
        </div>
    );
}