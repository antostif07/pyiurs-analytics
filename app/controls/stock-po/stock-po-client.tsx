"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle2,
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
import UniversalFilePreviewModal from "../store-transfers/_components/universal-file-preview-modal";

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

    // État unique pour le visualiseur universel plein écran
    const [universalPreview, setUniversalPreview] = useState<{
        open: boolean;
        url: string | null;
        fileName: string;
        mimeType?: string;
    }>({ open: false, url: null, fileName: "" });

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
        const url = `/api/controls/stock-po/${row.id}/file?field=${field}`;
        setUniversalPreview({
            open: true,
            url,
            fileName: meta.fileName,
            mimeType: meta.mimeType,
        });
    };

    const handlePreviewValidation = (row: StockPoRow) => {
        const url = `/api/controls/stock-po/${row.id}/validation-file`;
        setUniversalPreview({
            open: true,
            url,
            fileName: row.validationFileName || `Validation ${row.name}`,
            mimeType: row.validationMimeType ?? undefined,
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

            {/* Le visualiseur universel plein écran */}
            <UniversalFilePreviewModal
                open={universalPreview.open}
                onOpenChange={(open) => setUniversalPreview((p) => ({ ...p, open }))}
                fileUrl={universalPreview.url}
                fileName={universalPreview.fileName}
                mimeType={universalPreview.mimeType}
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
        </div>
    );
}