"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    Loader2,
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import StockPoFilters from "./_components/stock-po-filters";
import StockPoTable from "./_components/stock-po-table";
import PickingsDialog from "./_components/pickings-dialog";
import ExcelPreviewDialog from "./_components/excel-preview-dialog";
import ValidateStockPoDialog from "./_components/validate-stock-po-dialog";
import { useStockPo } from "./_lib/hooks/use-stock-po";
import {
    useUnvalidateStockPo,
    useValidateStockPo,
} from "./_lib/hooks/use-validate-stock-po";
import type {
    StockPoAttachmentMeta,
    StockPoReportData,
    StockPoRow,
} from "./_lib/types";

type PoFileField = "x_studio_fichier_excel_ca" | "x_studio_facture_fournisseur";

export default function StockPoClient({
    mode = "bty_fem",
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
    userRole,
}: {
    mode?: "bty_fem" | "polog";
    initialData?: StockPoReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
    userRole: string;
}) {
    const isPolog = mode === "polog";

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
        mode,
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const canValidate = userRole === "admin" || userRole === "controller";
    const canUnvalidate = userRole === "admin";

    const validateMutation = useValidateStockPo();
    const unvalidateMutation = useUnvalidateStockPo();

    const [pickingsOrder, setPickingsOrder] = useState<StockPoRow | null>(null);
    const [validateTarget, setValidateTarget] = useState<StockPoRow | null>(null);
    const [unvalidateTarget, setUnvalidateTarget] = useState<StockPoRow | null>(null);

    const [excelPreview, setExcelPreview] = useState<{
        open: boolean;
        poId: number | null;
        field: PoFileField | null;
        fileName: string;
    }>({ open: false, poId: null, field: null, fileName: "" });

    const [filePreview, setFilePreview] = useState<{
        open: boolean;
        url: string;
        downloadUrl: string;
        title: string;
        isPdf: boolean;
    }>({ open: false, url: "", downloadUrl: "", title: "", isPdf: false });

    const orders = data?.orders ?? [];
    const kpis = data?.kpis ?? {
        totalOrders: 0,
        withExcelCaCount: 0,
        withInvoiceCount: 0,
        totalPickings: 0,
        donePickings: 0,
        validatedCount: 0,
    };

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success(isPolog ? "Stock POLOG actualisés" : "Stock PO actualisés");
    };

    const handlePreviewFile = (
        row: StockPoRow,
        field: PoFileField,
        meta: StockPoAttachmentMeta,
    ) => {
        const lower = meta.fileName.toLowerCase();
        const isExcel =
            field === "x_studio_fichier_excel_ca" ||
            lower.endsWith(".xlsx") ||
            lower.endsWith(".xls") ||
            lower.endsWith(".csv") ||
            meta.mimeType.includes("spreadsheet") ||
            meta.mimeType.includes("excel") ||
            meta.mimeType.includes("csv");

        if (isExcel) {
            setExcelPreview({
                open: true,
                poId: row.id,
                field,
                fileName: meta.fileName,
            });
            return;
        }

        const baseUrl = `/api/controls/stock-po/${row.id}/file?field=${field}`;
        setFilePreview({
            open: true,
            url: baseUrl,
            downloadUrl: `${baseUrl}&download=1`,
            title: meta.fileName,
            isPdf:
                !meta.mimeType.startsWith("image/") &&
                !/\.(png|jpe?g|webp)$/i.test(lower),
        });
    };

    const handlePreviewValidation = (row: StockPoRow) => {
        const baseUrl = `/api/controls/stock-po/${row.id}/validation-file`;
        setFilePreview({
            open: true,
            url: baseUrl,
            downloadUrl: `${baseUrl}?download=1`,
            title: row.validationFileName || `Validation ${row.name}`,
            isPdf: row.validationMimeType === "application/pdf",
        });
    };

    const handleSubmitValidation = async (file: File, notes?: string) => {
        if (!validateTarget) return;
        try {
            await validateMutation.mutateAsync({
                odooPoId: validateTarget.id,
                file,
                notes,
            });
            toast.success(`PO ${validateTarget.name} validé`);
            setValidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec de la validation");
            throw e;
        }
    };

    const handleConfirmUnvalidate = async () => {
        if (!unvalidateTarget) return;
        try {
            await unvalidateMutation.mutateAsync(unvalidateTarget.id);
            toast.success(`Validation de ${unvalidateTarget.name} retirée`);
            setUnvalidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec de la suppression");
        }
    };

    return (
        <div>
            <ReportPageHeader
                title={isPolog ? "Stock POLOG" : "Stock PO"}
                subtitle={
                    isPolog
                        ? "Commandes d'achat fournisseurs LOG, pièces jointes et réceptions"
                        : "Commandes d'achat P.BTY & P.FEM, pièces jointes et réceptions"
                }
                badge={{
                    label: canValidate ? "Contrôle Complet" : "Lecture seule",
                    tone: canValidate ? "emerald" : "neutral",
                }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <StockPoFilters filters={filters} hideSupplierFilter={isPolog} />
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            className="h-7 text-[11px] gap-1.5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Réessayer
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <CeoKpiCard
                        label="Total PO"
                        value={String(kpis.totalOrders)}
                        subtitle={isPolog ? "Fournisseurs LOG" : "Fournisseurs P.BTY / P.FEM"}
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
                    <CeoKpiCard
                        label="PO Validés"
                        value={String(kpis.validatedCount)}
                        subtitle={`${kpis.totalOrders - kpis.validatedCount} en attente`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Bons de commande fournisseurs">
                    <StockPoTable
                        data={orders}
                        canValidate={canValidate}
                        canUnvalidate={canUnvalidate}
                        onOpenPickings={setPickingsOrder}
                        onPreviewFile={handlePreviewFile}
                        onValidate={setValidateTarget}
                        onUnvalidate={setUnvalidateTarget}
                        onPreviewValidation={handlePreviewValidation}
                    />
                </ReportSection>
            </div>

            <PickingsDialog
                order={pickingsOrder}
                open={!!pickingsOrder}
                onOpenChange={(open) => !open && setPickingsOrder(null)}
            />

            <ExcelPreviewDialog
                poId={excelPreview.poId}
                field={excelPreview.field}
                fileName={excelPreview.fileName}
                open={excelPreview.open}
                onOpenChange={(open) => setExcelPreview((p) => ({ ...p, open }))}
            />

            <ValidateStockPoDialog
                order={validateTarget}
                open={!!validateTarget}
                onOpenChange={(open) => !open && setValidateTarget(null)}
                onSubmit={handleSubmitValidation}
                isSubmitting={validateMutation.isPending}
            />

            {/* Confirmation suppression validation (admin uniquement) */}
            <Dialog
                open={!!unvalidateTarget}
                onOpenChange={(open) =>
                    !open && !unvalidateMutation.isPending && setUnvalidateTarget(null)
                }
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Retirer la validation ?</DialogTitle>
                        <DialogDescription className="text-xs">
                            Le justificatif de validation du PO « {unvalidateTarget?.name} » sera
                            supprimé définitivement du serveur.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={unvalidateMutation.isPending}
                            onClick={() => setUnvalidateTarget(null)}
                            className="h-7 text-[11px]"
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={unvalidateMutation.isPending}
                            onClick={handleConfirmUnvalidate}
                            className="h-7 text-[11px] gap-1.5"
                        >
                            {unvalidateMutation.isPending && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            Retirer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Aperçu PDF / Image */}
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
                            href={filePreview.downloadUrl}
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