"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    BadgeDollarSign,
    Check,
    CheckCircle2,
    Clock,
    ExternalLink,
    Loader2,
    Receipt,
    RefreshCw,
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

import RedsupFilters from "./_components/redsup-filters";
import RedsupTable from "./_components/redsup-table";
import OrderDetailsDialog from "./_components/order-details-dialog";
import { useRedsupInvoices } from "./_lib/hooks/use-redsup-invoices";
import {
    useAttachRedsupPhoto,
    useDeleteRedsupPhoto,
    useUnvalidateRedsup,
    useValidateRedsup,
} from "./_lib/hooks/use-validate-redsup";
import type { RedsupInvoiceRow, RedsupKpis, RedsupReportData } from "./_lib/types";
import AttachRedsupPhotoDialog from "./_components/attach-redsup-proof-dialog";
import ValidateRedsupDialog from "./_components/validate-redsup-dialog";

const FALLBACK_KPIS: RedsupKpis = {
    totalOrders: 0,
    totalAmount: 0,
    totalQty: 0,
    withPhotoCount: 0,
    validatedCount: 0,
    pendingCount: 0,
};

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface SignedCacheEntry {
    url: string;
    isPdf: boolean;
    expiresAt: number;
}

interface ValidationRemiseClientProps {
    initialData?: RedsupReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
    userRole: string;
}

export default function ValidationRemiseClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
    userRole,
}: ValidationRemiseClientProps) {
    const {
        data,
        filters,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useRedsupInvoices({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const canAttachPhoto = ["admin", "controller", "manager"].includes(userRole);
    const canValidate = ["admin", "controller"].includes(userRole);
    const canUnvalidate = userRole === "admin";

    const attachPhotoMutation = useAttachRedsupPhoto();
    const deletePhotoMutation = useDeleteRedsupPhoto();
    const validateMutation = useValidateRedsup();
    const unvalidateMutation = useUnvalidateRedsup();
    const [validateTarget, setValidateTarget] = useState<RedsupInvoiceRow | null>(null);

    const [photoDialogTarget, setPhotoDialogTarget] = useState<RedsupInvoiceRow | null>(null);
    const [unvalidateTarget, setUnvalidateTarget] = useState<RedsupInvoiceRow | null>(null);
    const [detailsTarget, setDetailsTarget] = useState<RedsupInvoiceRow | null>(null);
    const [validatingOrderId, setValidatingOrderId] = useState<number | null>(null);

    const signedCacheRef = useRef<Map<number, SignedCacheEntry>>(new Map());
    const [mediaModal, setMediaModal] = useState<{
        open: boolean;
        invoice: RedsupInvoiceRow | null;
        loading: boolean;
        url: string | null;
        isPdf: boolean;
        error: string | null;
    }>({ open: false, invoice: null, loading: false, url: null, isPdf: false, error: null });

    const invoices = data?.invoices ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Remises RedSup actualisées");
    };

    const handleViewPhoto = async (invoice: RedsupInvoiceRow) => {
        const cached = signedCacheRef.current.get(invoice.odooOrderId);
        if (cached && cached.expiresAt > Date.now()) {
            setMediaModal({
                open: true,
                invoice,
                loading: false,
                url: cached.url,
                isPdf: cached.isPdf,
                error: null,
            });
            return;
        }

        setMediaModal({
            open: true,
            invoice,
            loading: true,
            url: null,
            isPdf: false,
            error: null,
        });

        try {
            const res = await fetch(
                `/api/controls/validation-remise/${invoice.odooOrderId}/photo`,
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.url) {
                throw new Error(body.error ?? "Impossible de charger la photo");
            }
            signedCacheRef.current.set(invoice.odooOrderId, {
                url: body.url,
                isPdf: Boolean(body.isPdf),
                expiresAt: Date.now() + 50 * 60 * 1000,
            });
            setMediaModal((prev) =>
                prev.open ? { ...prev, loading: false, url: body.url, isPdf: Boolean(body.isPdf) } : prev,
            );
        } catch (e) {
            setMediaModal((prev) =>
                prev.open
                    ? { ...prev, loading: false, error: e instanceof Error ? e.message : "Erreur" }
                    : prev,
            );
        }
    };

    const handleSubmitPhoto = async (file: File) => {
        if (!photoDialogTarget) return;
        try {
            await attachPhotoMutation.mutateAsync({
                odooOrderId: photoDialogTarget.odooOrderId,
                file,
            });
            signedCacheRef.current.delete(photoDialogTarget.odooOrderId);
            toast.success("Photo d'autorisation enregistrée");
            setPhotoDialogTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
            throw e;
        }
    };

    const handleDeletePhoto = async () => {
        if (!photoDialogTarget) return;
        try {
            await deletePhotoMutation.mutateAsync(photoDialogTarget.odooOrderId);
            signedCacheRef.current.delete(photoDialogTarget.odooOrderId);
            toast.success("Photo supprimée");
            setPhotoDialogTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const handleValidateOneClick = async (invoice: RedsupInvoiceRow) => {
        setValidatingOrderId(invoice.odooOrderId);
        try {
            await validateMutation.mutateAsync(invoice.odooOrderId);
            toast.success(`Remise ${invoice.orderName} validée`);
            setValidateTarget(null);
            if (mediaModal.open && mediaModal.invoice?.odooOrderId === invoice.odooOrderId) {
                setMediaModal((prev) => ({ ...prev, open: false }));
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec de la validation");
        } finally {
            setValidatingOrderId(null);
        }
    };

    const handleConfirmUnvalidate = async () => {
        if (!unvalidateTarget) return;
        try {
            await unvalidateMutation.mutateAsync(unvalidateTarget.odooOrderId);
            toast.success("Validation retirée");
            setUnvalidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const validationRate =
        kpis.totalOrders > 0 ? Math.round((kpis.validatedCount / kpis.totalOrders) * 100) : 0;

    return (
        <div>
            <ReportPageHeader
                title="Validation de remise"
                subtitle="Autorisation jointe par le manager · validation controller & admin"
                badge={{ label: "Live Odoo", tone: "amber" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <RedsupFilters filters={filters} />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {isError && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                                {error instanceof Error ? error.message : "Erreur lors du chargement."}
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
                        label="Commandes RedSup"
                        value={String(kpis.totalOrders)}
                        subtitle={`${kpis.totalQty} article${kpis.totalQty > 1 ? "s" : ""}`}
                        icon={<Receipt className="w-3.5 h-3.5" />}
                        iconColor="text-pink-600 dark:text-pink-400"
                        iconBg="bg-pink-50 dark:bg-pink-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Montant RedSup"
                        value={`${fmt(kpis.totalAmount)} $`}
                        subtitle={`${kpis.withPhotoCount} / ${kpis.totalOrders} avec photo`}
                        icon={<BadgeDollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Validées"
                        value={String(kpis.validatedCount)}
                        subtitle={`${validationRate} % du total`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="En attente"
                        value={String(kpis.pendingCount)}
                        subtitle="À valider par controller / admin"
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Factures contenant des produits RedSup">
                    <RedsupTable
                        data={invoices}
                        canAttachPhoto={canAttachPhoto}
                        canValidate={canValidate}
                        canUnvalidate={canUnvalidate}
                        validatingOrderId={validatingOrderId}
                        onAttachPhoto={setPhotoDialogTarget}
                        onValidate={setValidateTarget}
                        onUnvalidate={setUnvalidateTarget}
                        onViewDetails={setDetailsTarget}
                        onViewPhoto={handleViewPhoto}
                    />
                </ReportSection>
            </div>

            <OrderDetailsDialog
                invoice={detailsTarget}
                open={!!detailsTarget}
                onOpenChange={(open) => !open && setDetailsTarget(null)}
            />

            <AttachRedsupPhotoDialog
                invoice={photoDialogTarget}
                open={!!photoDialogTarget}
                onOpenChange={(open) => !open && setPhotoDialogTarget(null)}
                onSubmit={handleSubmitPhoto}
                onDeletePhoto={handleDeletePhoto}
                isSubmitting={attachPhotoMutation.isPending || deletePhotoMutation.isPending}
            />

            <ValidateRedsupDialog
                invoice={validateTarget}
                open={!!validateTarget}
                onOpenChange={(open) => !open && setValidateTarget(null)}
                onConfirm={async () => {
                    if (validateTarget) await handleValidateOneClick(validateTarget);
                }}
                onViewPhoto={handleViewPhoto}
                isSubmitting={
                    !!validateTarget && validatingOrderId === validateTarget.odooOrderId
                }
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
                            La commande « {unvalidateTarget?.orderName} » repassera en attente de
                            validation. La photo d&apos;autorisation restera attachée.
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

            {/* Aperçu photo + bouton Valider direct pour Controller / Admin */}
            <Dialog
                open={mediaModal.open}
                onOpenChange={(open) =>
                    !open && setMediaModal((prev) => ({ ...prev, open: false }))
                }
            >
                <DialogContent className="max-w-3xl p-4">
                    <DialogHeader className="flex flex-row items-center justify-between pr-6">
                        <DialogTitle className="text-xs font-semibold truncate">
                            Autorisation — {mediaModal.invoice?.orderName}
                            {mediaModal.invoice?.photoAttachedBy
                                ? ` (joint par ${mediaModal.invoice.photoAttachedBy})`
                                : ""}
                        </DialogTitle>
                        {mediaModal.url && (
                            <a
                                href={mediaModal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline shrink-0"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Ouvrir
                            </a>
                        )}
                    </DialogHeader>

                    {mediaModal.loading && (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {mediaModal.error && (
                        <div className="flex items-center justify-center h-40 text-xs text-rose-600">
                            {mediaModal.error}
                        </div>
                    )}
                    {!mediaModal.loading && !mediaModal.error && mediaModal.url && (
                        mediaModal.isPdf ? (
                            <iframe
                                src={mediaModal.url}
                                title="Autorisation RedSup"
                                className="w-full h-[65vh] rounded-md border border-border"
                            />
                        ) : (
                            <img
                                src={mediaModal.url}
                                alt="Autorisation RedSup"
                                className="w-full max-h-[70vh] object-contain rounded-md"
                            />
                        )
                    )}

                    {/* Validation directe après lecture de la photo */}
                    {canValidate && mediaModal.invoice && !mediaModal.invoice.isValidated && mediaModal.url && (
                        <DialogFooter className="border-t border-border/60 pt-3">
                            <Button
                                size="sm"
                                disabled={validatingOrderId === mediaModal.invoice.odooOrderId}
                                onClick={() => handleValidateOneClick(mediaModal.invoice!)}
                                className="h-7 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {validatingOrderId === mediaModal.invoice.odooOrderId ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Check className="w-3 h-3" />
                                )}
                                Valider cette remise
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}