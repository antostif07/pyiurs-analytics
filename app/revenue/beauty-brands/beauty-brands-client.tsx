"use client";

import { toast } from "sonner";
import {
    AlertCircle,
    Calendar,
    Package,
    RefreshCw,
    Sparkles,
    TrendingUp,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Button } from "@/components/ui/button";

import BeautyBrandsFilters from "./_components/beauty-brands-filters";
import BeautyBrandsTable from "./_components/beauty-brands-table";
import { useBeautyBrands } from "./_lib/hooks/use-beauty-brands";
import type { BeautyBrandsReportData } from "./_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

export default function BeautyBrandsClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
}: {
    initialData?: BeautyBrandsReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const {
        data,
        filters,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useBeautyBrands({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const report = data ?? initialData;
    const brands = report?.brands ?? [];
    const boutiques = report?.boutiques ?? [];
    const dateRange = report?.dateRange ?? [];
    const kpis = report?.kpis ?? {
        totalAmount: 0,
        totalQuantity: 0,
        brandCount: 0,
        productCount: 0,
        averagePerBrand: 0,
    };

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Ventes Beauty actualisées");
    };

    const handleExportCsv = () => {
        if (brands.length === 0) return;
        const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const header = ["Marque", "Gamme (HS Code)", "Produit", "Quantité", "Montant ($)"];
        const rows: string[] = [header.join(";")];

        for (const b of brands) {
            for (const hs of b.hsGroups) {
                for (const p of hs.products) {
                    rows.push(
                        [
                            esc(b.name),
                            esc(hs.name),
                            esc(p.name),
                            p.totalQuantity,
                            p.totalAmount.toFixed(2),
                        ].join(";"),
                    );
                }
            }
        }

        const blob = new Blob(["\uFEFF" + rows.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `beauty-brands_${filters.year}-${String(filters.month).padStart(2, "0")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export CSV téléchargé");
    };

    return (
        <div>
            <ReportPageHeader
                title="Beauty par Marque"
                subtitle="Analyse journalière par marque, gamme (HS Code) et produit"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <BeautyBrandsFilters
                    filters={report?.filters ?? filters}
                    boutiques={boutiques}
                    onExportCsv={handleExportCsv}
                    canExport={brands.length > 0}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {isError && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                                {error instanceof Error ? error.message : "Erreur de chargement."}
                            </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRefresh} className="h-7 text-[11px] gap-1.5">
                            <RefreshCw className="w-3 h-3" />
                            Réessayer
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="CA Total Beauty"
                        value={`${fmt(kpis.totalAmount)} $`}
                        subtitle={`${kpis.totalQuantity} unité${kpis.totalQuantity > 1 ? "s" : ""} vendue${kpis.totalQuantity > 1 ? "s" : ""}`}
                        icon={<Sparkles className="w-3.5 h-3.5" />}
                        iconColor="text-purple-600 dark:text-purple-400"
                        iconBg="bg-purple-50 dark:bg-purple-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Marques Actives"
                        value={String(kpis.brandCount)}
                        subtitle={`${kpis.productCount} produit${kpis.productCount > 1 ? "s" : ""}`}
                        icon={<Package className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Moyenne / Marque"
                        value={`${fmt(kpis.averagePerBrand)} $`}
                        subtitle="CA moyen par marque"
                        icon={<TrendingUp className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Jours d'activité"
                        value={`${dateRange.length} j`}
                        subtitle={`${String(filters.month).padStart(2, "0")}/${filters.year}`}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Matrice journalière par marque">
                    <BeautyBrandsTable brands={brands} dateRange={dateRange} />
                </ReportSection>
            </div>
        </div>
    );
}