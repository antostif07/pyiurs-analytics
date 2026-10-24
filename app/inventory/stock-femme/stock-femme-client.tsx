// app/inventory/stock-femme/stock-femme-client.tsx
"use client";

import {
    AlertCircle,
    Download,
    Layers,
    Loader2,
    Package,
    ShoppingCart,
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

import StockFemmeFilters from "./_components/stock-femme-filters";
import StockLegend from "./_components/stock-legend";
import { useExportStockFemme } from "./_lib/hooks/use-export-stock-femme";
import type {
    ControlStockFemmeModel,
    FilterState,
    StockFemmeTotals,
    StockLevels,
} from "./_lib/types";
import StockFemmeTable from "./_components/stock-femme-table";

interface StockFemmeClientProps {
    data: ControlStockFemmeModel[];
    brands: string[];
    colors: string[];
    partners: string[];
    orderNames: string[];
    shops: string[]; // ← nouveau
    totals: StockFemmeTotals;
    stockLevels: StockLevels;
    filterState: FilterState;
}

export default function StockFemmeClient({
    data,
    brands,
    colors,
    partners,
    orderNames,
    shops, // ← nouveau
    totals,
    stockLevels,
    filterState,
}: StockFemmeClientProps) {
    const { exportStockFemme, isExporting } = useExportStockFemme();

    return (
        <div>
            <ReportPageHeader
                title="Suivi Stock Femme"
                subtitle="Contrôle du stock du segment Femme par boutique"
                badge={{ label: "Femme", tone: "violet" }}
                extraActions={
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
                                onClick={() => exportStockFemme("XLSX")}
                                className="text-xs py-1.5 cursor-pointer"
                            >
                                Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={isExporting}
                                onClick={() => exportStockFemme("CSV")}
                                className="text-xs py-1.5 cursor-pointer"
                            >
                                CSV (données brutes)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={isExporting}
                                onClick={() => exportStockFemme("PDF")}
                                className="text-xs py-1.5 cursor-pointer"
                            >
                                PDF (rapport)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            >
                <StockFemmeFilters
                    brands={brands}
                    colors={colors}
                    partners={partners}
                    orderNames={orderNames}
                    stockLevels={stockLevels}
                    current={filterState}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Produits"
                        value={String(totals.totalProducts)}
                        subtitle="Références dans le scope"
                        icon={<Layers className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                    <CeoKpiCard
                        label="Quantité disponible"
                        value={String(totals.totalAvailable)}
                        subtitle="Stock physique total"
                        icon={<Package className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Vendus"
                        value={String(totals.totalSold)}
                        subtitle="Sur la période"
                        icon={<ShoppingCart className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Ruptures"
                        value={String(stockLevels.outOfStock)}
                        subtitle="Produits en rupture"
                        icon={<AlertCircle className="w-3.5 h-3.5" />}
                        iconColor={
                            stockLevels.outOfStock > 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                        }
                        iconBg={
                            stockLevels.outOfStock > 0
                                ? "bg-rose-50 dark:bg-rose-950/40"
                                : "bg-emerald-50 dark:bg-emerald-950/40"
                        }
                    />
                </div>

                <ReportSection
                    index={1}
                    title={`Inventaire Femme · ${data.length} produit${data.length > 1 ? "s" : ""}`}
                >
                    <StockFemmeTable tableData={data} shops={shops} />
                </ReportSection>

                <StockLegend />
            </div>
        </div>
    );
}