"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    ArrowLeftRight,
    Check,
    CheckCircle2,
    ExternalLink,
    FileCheck2,
    Loader2,
    PackageCheck,
    RefreshCw,
    ShieldCheck,
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

import TransferFilters from "./_components/transfer-filters";
import StoreTransfersTable from "./_components/store-transfers-table";
import UploadTransferFileDialog from "./_components/upload-transfer-file-dialog";
import {
    useStoreTransfers,
    useUnvalidateTransfer,
    useUploadTransferFile,
    useValidateTransfer,
} from "./_lib/hooks/use-store-transfers";
import type {
    StoreTransferRow,
    StoreTransfersReportData,
    TransferFileMeta,
} from "./_lib/types";

export default function StoreTransfersClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
    userRole,
}: {
    initialData?: StoreTransfersReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
    userRole: string;
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
    } = useStoreTransfers({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const canUploadDpOut =
        userRole === "admin" ||
        userRole === "inventory-manager" ||
        userRole === "inventory_manager";
    const canUploadDpIn = userRole === "admin" || userRole === "manager";
    const canValidate = userRole === "admin" || userRole === "controller";
    const canUnvalidate = userRole === "admin";

    const uploadMutation = useUploadTransferFile();
    const validateMutation = useValidateTransfer();
    const unvalidateMutation = useUnvalidateTransfer();

    const [uploadState, setUploadState] = useState<{
        row: StoreTransferRow | null;
        kind: "dp_out" | "dp_in" | null;
    }>({ row: null, kind: null });

    const [validateTarget, setValidateTarget] = useState<StoreTransferRow | null>(null);
    const [unvalidateTarget, setUnvalidateTarget] = useState<StoreTransferRow | null>(null);

    const [filePreview, setFilePreview] = useState<{
        open: boolean;
        url: string;
        downloadUrl: string;
        title: string;
        isPdf: boolean;
    }>({ open: false, url: "", downloadUrl: "", title: "", isPdf: false });

    const transfers = data?.transfers ?? [];
    const kpis = data?.kpis ?? {
        totalTransfers: 0,
        withPoCount: 0,
        dpOutCount: 0,
        dpInCount: 0,
        validatedCount: 0,
    };

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Transferts actualisés");
    };

    const handlePreviewFile = (
        row: StoreTransferRow,
        kind: "dp_out" | "dp_in",
        meta: TransferFileMeta,
    ) => {
        const base = `/api/controls/store-transfers/${row.saleOrderId}/file?kind=${kind}`;
        setFilePreview({
            open: true,
            url: base,
            downloadUrl: `${base}&download=1`,
            title: `${kind === "dp_out" ? "DP/OUT" : "DP/IN"} — ${meta.fileName}`,
            isPdf: meta.mimeType === "application/pdf",
        });
    };

    const handleSubmitUpload = async (file: File) => {
        if (!uploadState.row || !uploadState.kind) return;
        try {
            await uploadMutation.mutateAsync({
                saleOrderId: uploadState.row.saleOrderId,
                kind: uploadState.kind,
                file,
            });
            toast.success(
                `${uploadState.kind === "dp_out" ? "DP/OUT" : "DP/IN"} enregistré`,
            );
            setUploadState({ row: null, kind: null });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
            throw e;
        }
    };

    const handleConfirmValidate = async () => {
        if (!validateTarget) return;
        try {
            await validateMutation.mutateAsync(validateTarget.saleOrderId);
            toast.success(`Transfert ${validateTarget.saleOrderName} validé`);
            setValidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const handleConfirmUnvalidate = async () => {
        if (!unvalidateTarget) return;
        try {
            await unvalidateMutation.mutateAsync(unvalidateTarget.saleOrderId);
            toast.success("Validation retirée");
            setUnvalidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    return (
        <div>
            <ReportPageHeader
                title="Transferts Inter-Boutiques"
                subtitle="Livraisons PB - BC (SO → PO généré), justificatifs DP/OUT & DP/IN"
                badge={{ label: "Live Odoo", tone: "amber" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <TransferFilters filters={filters} />
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

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <CeoKpiCard
                        label="Transferts (SO)"
                        value={String(kpis.totalTransfers)}
                        subtitle={`${kpis.withPoCount} avec PO généré`}
                        icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="PO Générés"
                        value={String(kpis.withPoCount)}
                        subtitle={`sur ${kpis.totalTransfers} SO`}
                        icon={<PackageCheck className="w-3.5 h-3.5" />}
                        iconColor="text-indigo-600 dark:text-indigo-400"
                        iconBg="bg-indigo-50 dark:bg-indigo-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="DP/OUT joints"
                        value={String(kpis.dpOutCount)}
                        subtitle="Expédition (Inventory)"
                        icon={<FileCheck2 className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="DP/IN joints"
                        value={String(kpis.dpInCount)}
                        subtitle="Réception (Manager)"
                        icon={<FileCheck2 className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Validés"
                        value={String(kpis.validatedCount)}
                        subtitle={`${kpis.totalTransfers - kpis.validatedCount} en attente`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Liste des transferts PB - BC">
                    <StoreTransfersTable
                        data={transfers}
                        canUploadDpOut={canUploadDpOut}
                        canUploadDpIn={canUploadDpIn}
                        canValidate={canValidate}
                        canUnvalidate={canUnvalidate}
                        onUploadFile={(row, kind) => setUploadState({ row, kind })}
                        onPreviewFile={handlePreviewFile}
                        onValidate={setValidateTarget}
                        onUnvalidate={setUnvalidateTarget}
                    />
                </ReportSection>
            </div>

            <UploadTransferFileDialog
                transfer={uploadState.row}
                kind={uploadState.kind}
                open={!!uploadState.row && !!uploadState.kind}
                onOpenChange={(open) => !open && setUploadState({ row: null, kind: null })}
                onSubmit={handleSubmitUpload}
                isSubmitting={uploadMutation.isPending}
            />

            {/* Confirmation validation controller/admin */}
            <Dialog
                open={!!validateTarget}
                onOpenChange={(open) => !open && !validateMutation.isPending && setValidateTarget(null)}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Confirmer la validation
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Valider le transfert {validateTarget?.saleOrderName}
                            {validateTarget?.generatedPo ? ` (${validateTarget.generatedPo.name})` : ""} vers{" "}
                            {validateTarget?.destinationPartnerName} ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={validateMutation.isPending}
                            onClick={() => setValidateTarget(null)}
                            className="h-7 text-[11px]"
                        >
                            Annuler
                        </Button>
                        <Button
                            size="sm"
                            disabled={validateMutation.isPending}
                            onClick={handleConfirmValidate}
                            className="h-7 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {validateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation retrait validation (admin uniquement) */}
            <Dialog
                open={!!unvalidateTarget}
                onOpenChange={(open) => !open && !unvalidateMutation.isPending && setUnvalidateTarget(null)}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Retirer la validation ?</DialogTitle>
                        <DialogDescription className="text-xs">
                            Le transfert « {unvalidateTarget?.saleOrderName} » repassera en attente (les
                            fichiers DP/OUT et DP/IN restent conservés).
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
                            {unvalidateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
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
                        <DialogTitle className="text-xs font-semibold truncate">{filePreview.title}</DialogTitle>
                        <a
                            href={filePreview.downloadUrl}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline shrink-0"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Télécharger
                        </a>
                    </DialogHeader>
                    {filePreview.isPdf ? (
                        <iframe src={filePreview.url} title={filePreview.title} className="w-full h-[70vh] rounded-md border border-border" />
                    ) : (
                        <img src={filePreview.url} alt={filePreview.title} className="w-full max-h-[75vh] object-contain rounded-md" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}