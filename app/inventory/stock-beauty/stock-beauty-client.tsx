// app/inventory/stock-beauty/stock-beauty-client.tsx
"use client";

import {
    AlertCircle,
    Download,
    Heart,
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

import StockBeautyFilters from "./_components/stock-beauty-filters";
import StockBeautyTable from "./_components/stock-beauty-table";
import { useExportStockBeauty } from "./_lib/hooks/use-export-stock-beauty";
import type {
    FilterState,
    StockBeautyModel,
    StockBeautyTotals,
    StockLevels,
} from "./_lib/types";
import StockBeautyLegend from "./_components/stock-beauty-legend";

interface Props {
    data: StockBeautyModel[];
    brands: string[];
    colors: string[];
    categories: string[];
    suppliers: string[];
    shops: string[];
    totals: StockBeautyTotals;
    stockLevels: StockLevels;
    filterState: FilterState;
}

export default function StockBeautyClient({
    data,
    brands,
    colors,
    categories,
    suppliers,
    shops,
    totals,
    stockLevels,
    filterState,
}: Props) {
    const { exportExcel, isExporting } = useExportStockBeauty();

    return (
        <div>
            <ReportPageHeader
                title="Suivi Stock Beauty"
                subtitle="Contrôle du stock du segment Beauty par boutique"
                badge={{ label: "Beauty", tone: "sky" }}
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
                                onClick={() => exportExcel(data, "XLSX")}
                                className="text-xs py-1.5 cursor-pointer"
                            >
                                Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={isExporting}
                                onClick={() => exportExcel(data, "CSV")}
                                className="text-xs py-1.5 cursor-pointer"
                            >
                                CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            >
                <StockBeautyFilters
                    brands={brands}
                    colors={colors}
                    categories={categories}
                    suppliers={suppliers}
                    stockLevels={stockLevels}
                    current={filterState}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Produits"
                        value={String(totals.totalProducts)}
                        subtitle="Références Beauty"
                        icon={<Heart className="w-3.5 h-3.5" />}
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
                    title={`Inventaire Beauty · ${data.length} produit${data.length > 1 ? "s" : ""}`}
                >
                    <StockBeautyTable tableData={data} shops={shops} />
                </ReportSection>

                <StockBeautyLegend />
            </div>
        </div>
    );
}