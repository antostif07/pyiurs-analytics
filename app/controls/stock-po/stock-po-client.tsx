"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    PackageCheck,
    RefreshCw,
    Truck,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import StockPoFilters from "./_components/stock-po-filters";
import StockPoTable from "./_components/stock-po-table";
import PickingsDialog from "./_components/pickings-dialog";
import { useStockPo } from "./_lib/hooks/use-stock-po";
import type {
    StockPoAttachmentMeta,
    StockPoReportData,
    StockPoRow,
} from "./_lib/types";

export default function StockPoClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
    canEdit,
}: {
    initialData?: StockPoReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
    canEdit: boolean;
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
    } = useStockPo({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const [pickingsOrder, setPickingsOrder] = useState<StockPoRow | null>(null);
    const [filePreview, setFilePreview] = useState<{
        open: boolean;
        url: string;
        title: string;
        isPdf: boolean;
    }>({ open: false, url: "", title: "", isPdf: false });

    const orders = data?.orders ?? [];
    const kpis = data?.kpis ?? {
        totalOrders: 0,
        withExcelCaCount: 0,
        withInvoiceCount: 0,
        totalPickings: 0,
        donePickings: 0,
    };

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Stock PO actualisés");
    };

    const handlePreviewFile = (
        row: StockPoRow,
        field: "x_studio_fichier_excel_ca" | "x_studio_facture_fournisseur",
        meta: StockPoAttachmentMeta,
    ) => {
        setFilePreview({
            open: true,
            url: `/api/controls/stock-po/${row.id}/file?field=${field}`,
            title: `${row.name} — ${meta.fileName}`,
            isPdf: meta.mimeType === "application/pdf",
        });
    };

    return (
        <div>
            <ReportPageHeader
                title="Stock PO"
                subtitle="Commandes d'achat P.BTY & P.FEM, pièces jointes et réceptions"
                badge={{
                    label: canEdit ? "Contrôle Complet" : "Lecture seule",
                    tone: canEdit ? "emerald" : "neutral",
                }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <StockPoFilters filters={filters} />
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
                        label="Total PO"
                        value={String(kpis.totalOrders)}
                        subtitle="Fournisseurs P.BTY / P.FEM"
                        icon={<PackageCheck className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Excel CA joints"
                        value={String(kpis.withExcelCaCount)}
                        subtitle={`sur ${kpis.totalOrders} PO`}
                        icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Factures jointes"
                        value={String(kpis.withInvoiceCount)}
                        subtitle={`sur ${kpis.totalOrders} PO`}
                        icon={<FileText className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Réceptions (Pickings)"
                        value={String(kpis.totalPickings)}
                        subtitle={`${kpis.donePickings} terminé${kpis.donePickings > 1 ? "s" : ""}`}
                        icon={<Truck className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Bons de commande fournisseurs">
                    <StockPoTable
                        data={orders}
                        onOpenPickings={setPickingsOrder}
                        onPreviewFile={handlePreviewFile}
                    />
                </ReportSection>
            </div>

            <PickingsDialog
                order={pickingsOrder}
                open={!!pickingsOrder}
                onOpenChange={(open) => !open && setPickingsOrder(null)}
            />

            <Dialog
                open={filePreview.open}
                onOpenChange={(open) => !open && setFilePreview((p) => ({ ...p, open: false }))}
            >
                <DialogContent className="max-w-3xl p-4">
                    <DialogHeader className="flex flex-row items-center justify-between pr-6">
                        <DialogTitle className="text-xs font-semibold truncate">
                            {filePreview.title}
                        </DialogTitle>
                        <a
                            href={`${filePreview.url}&download=1`}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline shrink-0"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Télécharger
                        </a>
                    </DialogHeader>
                    {filePreview.isPdf ? (
                        <iframe
                            src={filePreview.url}
                            title={filePreview.title}
                            className="w-full h-[70vh] rounded-md border border-border"
                        />
                    ) : (
                        <img
                            src={filePreview.url}
                            alt={filePreview.title}
                            className="w-full max-h-[75vh] object-contain rounded-md"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}