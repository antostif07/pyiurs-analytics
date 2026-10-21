// app/inventory/rebalancing/rebalancing-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
    Scale,
    AlertTriangle,
    Package,
    Boxes,
    DollarSign,
    AlertCircle,
    FileSpreadsheet,
    Truck,
    Loader2,
    Download,
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

import RebalancingFilters from "./_components/rebalancing-filters";
import RebalancingTabs from "./_components/rebalancing-tabs";
import { parseRebalancingFilters } from "./_lib/filters";
import { useRebalancing } from "./_lib/hooks/use-rebalancing";
import { useExportRebalancing } from "./_lib/hooks/use-export-rebalancing";
import type { RebalancingCompany } from "./_lib/types";

interface RebalancingClientProps {
    companies: RebalancingCompany[];
}

const fmtMoney = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }) + " $";

export default function RebalancingClient({
    companies,
}: RebalancingClientProps) {
    const searchParams = useSearchParams();
    const filters = parseRebalancingFilters(
        Object.fromEntries(searchParams.entries()),
    );

    const selectedCompany =
        filters.companyId !== null
            ? companies.find(
                (c) => c.odooCompanyId === filters.companyId,
            ) ?? null
            : null;

    const { data, isLoading, error } = useRebalancing(filters.companyId);

    const rows = data?.rows ?? [];
    const totals = data?.totals;
    const shopsWithoutLocations = data?.shopsWithoutLocations ?? [];

    const { exportExcel, isExporting } = useExportRebalancing();

    // Classification client-side pour les compteurs d'export
    const exportCounts = useMemo(() => {
        if (filters.companyId === null) {
            return { internalCount: 0, saleCount: 0 };
        }
        const internalKeys = new Set<string>();
        const saleKeys = new Set<string>();

        for (const row of rows) {
            if (row.sources.length === 0) continue;
            const src = row.sources[0];
            if (src.companyId === filters.companyId) {
                internalKeys.add(`${src.locationId}|${row.locationId}`);
            } else {
                saleKeys.add(`${src.companyId}|${filters.companyId}`);
            }
        }
        return {
            internalCount: internalKeys.size,
            saleCount: saleKeys.size,
        };
    }, [rows, filters.companyId]);

    return (
        <div>
            {/* ══════════════ HEADER ══════════════ */}
            <ReportPageHeader
                title="Rééquilibrage"
                subtitle="Aligner le stock physique avec les ventes inter-boutiques"
                badge={{ label: "Stock", tone: "violet" }}
                isLoading={isLoading}
                extraActions={
                    selectedCompany && rows.length > 0 ? (
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
                                className="w-64 p-1 rounded-lg shadow-xl"
                            >
                                <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                    Format Excel
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={
                                        isExporting ||
                                        exportCounts.internalCount === 0
                                    }
                                    onClick={() =>
                                        filters.companyId !== null &&
                                        exportExcel(
                                            filters.companyId,
                                            "internal",
                                        )
                                    }
                                    className="text-xs py-1.5 cursor-pointer gap-2"
                                >
                                    <Truck className="w-3 h-3 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span>Transferts internes</span>
                                        <span className="text-[10px] text-muted-foreground/60">
                                            {exportCounts.internalCount}{" "}
                                            picking
                                            {exportCounts.internalCount > 1
                                                ? "s"
                                                : ""}
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={
                                        isExporting ||
                                        exportCounts.saleCount === 0
                                    }
                                    onClick={() =>
                                        filters.companyId !== null &&
                                        exportExcel(
                                            filters.companyId,
                                            "inter_company",
                                        )
                                    }
                                    className="text-xs py-1.5 cursor-pointer gap-2"
                                >
                                    <FileSpreadsheet className="w-3 h-3 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span>Ventes inter-company</span>
                                        <span className="text-[10px] text-muted-foreground/60">
                                            {exportCounts.saleCount} SO
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : undefined
                }
            >
                {/* ⬇️ Le sélecteur de compagnie est DANS le header */}
                <RebalancingFilters
                    companies={companies}
                    currentCompanyId={filters.companyId}
                />
            </ReportPageHeader>

            {/* ══════════════ CONTENU ══════════════ */}
            <div className="p-4 sm:p-5 space-y-4">
                {!selectedCompany ? (
                    <NoCompanySelected />
                ) : (
                    <>
                        {shopsWithoutLocations.length > 0 && (
                            <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <div>
                                    <strong>
                                        {shopsWithoutLocations.length}{" "}
                                        boutique
                                        {shopsWithoutLocations.length > 1
                                            ? "s"
                                            : ""}
                                    </strong>{" "}
                                    sans emplacement configuré :{" "}
                                    {shopsWithoutLocations
                                        .map((s) => s.name)
                                        .join(", ")}
                                    . Leurs stocks ne sont pas analysés.
                                </div>
                            </div>
                        )}

                        {error ? (
                            <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-center text-[11px] text-rose-700 dark:text-rose-400">
                                Erreur :{" "}
                                {error instanceof Error
                                    ? error.message
                                    : "Inconnue"}
                            </div>
                        ) : isLoading ? (
                            <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                                <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
                                    Chargement des déséquilibres…
                                </p>
                            </div>
                        ) : rows.length === 0 ? (
                            <EmptyRebalancing
                                companyName={selectedCompany.name}
                            />
                        ) : (
                            <>
                                {/* KPIs */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <CeoKpiCard
                                        label="Produits en déficit"
                                        value={String(
                                            totals?.count ?? rows.length,
                                        )}
                                        subtitle={`${totals?.withSource ?? 0} avec source`}
                                        icon={
                                            <Package className="w-3.5 h-3.5" />
                                        }
                                        iconColor="text-violet-600 dark:text-violet-400"
                                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                                    />
                                    <CeoKpiCard
                                        label="Qté manquante"
                                        value={String(
                                            totals?.totalQty ?? 0,
                                        )}
                                        subtitle="Pièces à rééquilibrer"
                                        icon={
                                            <Boxes className="w-3.5 h-3.5" />
                                        }
                                        iconColor="text-rose-600 dark:text-rose-400"
                                        iconBg="bg-rose-50 dark:bg-rose-950/40"
                                    />
                                    <CeoKpiCard
                                        label="Valeur estimée"
                                        value={fmtMoney(
                                            totals?.totalValue ?? 0,
                                        )}
                                        subtitle="Coût des produits manquants"
                                        icon={
                                            <DollarSign className="w-3.5 h-3.5" />
                                        }
                                        iconColor="text-sky-600 dark:text-sky-400"
                                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                                    />
                                    <CeoKpiCard
                                        label="Sans source"
                                        value={String(
                                            totals?.lostCount ?? 0,
                                        )}
                                        subtitle="Produits perdus"
                                        icon={
                                            <AlertCircle className="w-3.5 h-3.5" />
                                        }
                                        iconColor={
                                            (totals?.lostCount ?? 0) > 0
                                                ? "text-rose-600 dark:text-rose-400"
                                                : "text-emerald-600 dark:text-emerald-400"
                                        }
                                        iconBg={
                                            (totals?.lostCount ?? 0) > 0
                                                ? "bg-rose-50 dark:bg-rose-950/40"
                                                : "bg-emerald-50 dark:bg-emerald-950/40"
                                        }
                                    />
                                </div>

                                <ReportSection
                                    index={1}
                                    title={`Déséquilibres · ${selectedCompany.name}`}
                                >
                                    <RebalancingTabs rows={rows} />
                                </ReportSection>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────── */
/* État vide : aucune compagnie sélectionnée                     */
/* ──────────────────────────────────────────────────────────── */

function NoCompanySelected() {
    return (
        <div className="rounded-lg border border-border/60 border-dashed bg-card shadow-2xs p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                <Scale className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground">
                Sélectionnez une compagnie
            </h3>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-md mx-auto">
                Choisissez une compagnie dans le sélecteur ci-dessus pour
                afficher les produits dont le stock est négatif dans ses
                emplacements.
            </p>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────── */
/* État vide : aucun déséquilibre détecté                       */
/* ──────────────────────────────────────────────────────────── */

function EmptyRebalancing({ companyName }: { companyName: string }) {
    return (
        <div className="rounded-lg border border-border/60 border-dashed bg-card shadow-2xs p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground">
                Aucun déséquilibre détecté
            </h3>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-md mx-auto">
                Aucun produit en quantité négative dans les emplacements de{" "}
                {companyName}.
            </p>
        </div>
    );
}