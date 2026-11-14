"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    DollarSign,
    ExternalLink,
    FileCheck,
    Loader2,
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

import ExpensesFilters from "./_components/expenses-filters";
import ExpensesTable from "./_components/expenses-table";
import ValidateExpenseDialog from "./_components/validate-expense-dialog";
import { useExpenses } from "./_lib/hooks/use-expenses";
import {
    useAttachProof,
    useDeleteProof,
    useUnvalidateExpense,
    useValidateExpense,
} from "./_lib/hooks/use-validate-expense";
import type {
    CurrencyTotals,
    ExpenseRow,
    ExpensesKpis,
    ExpensesReportData,
} from "./_lib/types";
import AttachProofDialog from "./_components/attach-proof-dialog";

const FALLBACK_KPIS: ExpensesKpis = {
    totalCount: 0,
    validatedCount: 0,
    pendingCount: 0,
    byCurrency: [],
};

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

function formatCurrencyList(
    items: CurrencyTotals[],
    field: "totalAmount" | "validatedAmount" | "pendingAmount",
): string {
    if (items.length === 0) return "0,00 $";
    return items
        .map((c) => `${fmt(c[field])} ${c.currency === "USD" ? "$" : c.currency}`)
        .join("  ·  ");
}

interface SignedMediaCacheEntry {
    url: string;
    isPdf: boolean;
    expiresAt: number;
}

interface ExpensesClientProps {
    initialData?: ExpensesReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
    userRole: string;
}

export default function ExpensesClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
    userRole,
}: ExpensesClientProps) {
    const {
        data,
        filters,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useExpenses({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const canAttachProof = ["admin", "manager", "controller"].includes(userRole);
    const canValidate = ["admin", "controller"].includes(userRole);
    const canUnvalidate = ["admin", "controller"].includes(userRole);

    const attachProofMutation = useAttachProof();
    const deleteProofMutation = useDeleteProof();
    const validateMutation = useValidateExpense();
    const unvalidateMutation = useUnvalidateExpense();

    const [proofDialogExpense, setProofDialogExpense] = useState<ExpenseRow | null>(null);
    const [dialogExpense, setDialogExpense] = useState<ExpenseRow | null>(null);
    const [unvalidateTarget, setUnvalidateTarget] = useState<ExpenseRow | null>(null);

    // Cache client des URLs signées (50 min) + état modal aperçu
    const signedCacheRef = useRef<Map<string, SignedMediaCacheEntry>>(new Map());
    const [mediaModal, setMediaModal] = useState<{
        open: boolean;
        loading: boolean;
        url: string | null;
        isPdf: boolean;
        error: string | null;
        title: string;
    }>({
        open: false,
        loading: false,
        url: null,
        isPdf: false,
        error: null,
        title: "",
    });

    const expenses = data?.expenses ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;
    const categories = data?.categories ?? [];
    const companies = data?.companies ?? [];

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) {
            toast.error("Échec de l'actualisation");
        } else {
            toast.success("Dépenses actualisées");
        }
    };

    const handleViewPhoto = async (expense: ExpenseRow, kind: "auth" | "proof") => {
        const title =
            kind === "auth"
                ? `Autorisation — ${expense.name}`
                : `Preuve — ${expense.name}`;
        const cacheKey = `${expense.odooExpenseId}:${kind}`;
        const cached = signedCacheRef.current.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            setMediaModal({
                open: true,
                loading: false,
                url: cached.url,
                isPdf: cached.isPdf,
                error: null,
                title,
            });
            return;
        }

        setMediaModal({
            open: true,
            loading: true,
            url: null,
            isPdf: false,
            error: null,
            title,
        });

        try {
            const res = await fetch(
                `/api/finance/expenses/${expense.odooExpenseId}/photo?kind=${kind}`,
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.url) {
                throw new Error(body.error ?? "Impossible de charger le document");
            }

            signedCacheRef.current.set(cacheKey, {
                url: body.url,
                isPdf: Boolean(body.isPdf),
                expiresAt: Date.now() + 50 * 60 * 1000,
            });

            setMediaModal((prev) =>
                prev.open
                    ? {
                        ...prev,
                        loading: false,
                        url: body.url,
                        isPdf: Boolean(body.isPdf),
                    }
                    : prev,
            );
        } catch (e) {
            setMediaModal((prev) =>
                prev.open
                    ? {
                        ...prev,
                        loading: false,
                        error: e instanceof Error ? e.message : "Erreur de chargement",
                    }
                    : prev,
            );
        }
    };

    const handleSubmitProof = async (proofFile: File) => {
        if (!proofDialogExpense) return;
        try {
            await attachProofMutation.mutateAsync({
                odooExpenseId: proofDialogExpense.odooExpenseId,
                proofFile,
            });
            signedCacheRef.current.delete(`${proofDialogExpense.odooExpenseId}:proof`);
            toast.success("Preuve enregistrée");
            setProofDialogExpense(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
            throw e;
        }
    };

    const handleDeleteProof = async () => {
        if (!proofDialogExpense) return;
        try {
            await deleteProofMutation.mutateAsync(proofDialogExpense.odooExpenseId);
            signedCacheRef.current.delete(`${proofDialogExpense.odooExpenseId}:proof`);
            toast.success("Preuve supprimée");
            setProofDialogExpense(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const handleSubmitValidation = async (validationFile: File, notes?: string) => {
        if (!dialogExpense) return;
        try {
            await validateMutation.mutateAsync({
                odooExpenseId: dialogExpense.odooExpenseId,
                validationFile,
                notes,
            });
            signedCacheRef.current.delete(`${dialogExpense.odooExpenseId}:auth`);
            toast.success("Dépense validée");
            setDialogExpense(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
            throw e;
        }
    };

    const handleConfirmUnvalidate = async () => {
        if (!unvalidateTarget) return;
        try {
            await unvalidateMutation.mutateAsync(unvalidateTarget.odooExpenseId);
            signedCacheRef.current.delete(`${unvalidateTarget.odooExpenseId}:auth`);
            signedCacheRef.current.delete(`${unvalidateTarget.odooExpenseId}:proof`);
            toast.success("Validation retirée");
            setUnvalidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const primaryCurrencyValue = formatCurrencyList(kpis.byCurrency, "totalAmount");
    const validatedCurrencySub = formatCurrencyList(kpis.byCurrency, "validatedAmount");
    const pendingCurrencySub = formatCurrencyList(kpis.byCurrency, "pendingAmount");

    return (
        <div>
            <ReportPageHeader
                title="Notes de Frais"
                subtitle="Consultation, validation et suivi des dépenses Odoo"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <ExpensesFilters
                    from={filters.from}
                    to={filters.to}
                    categoryIds={filters.categoryIds}
                    categories={categories}
                    companyId={filters.companyId}
                    companies={companies}
                    state={filters.state}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {isError && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                                {error instanceof Error
                                    ? error.message
                                    : "Erreur lors du chargement des dépenses Odoo."}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            className="h-7 text-[11px] gap-1.5 border-rose-300 dark:border-rose-700"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Réessayer
                        </Button>
                    </div>
                )}

                {/* KPIs — skeleton uniquement au 1er chargement (isLoading) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Total Dépenses"
                        value={primaryCurrencyValue}
                        subtitle={`${kpis.totalCount} dépense${kpis.totalCount > 1 ? "s" : ""}`}
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Validées"
                        value={String(kpis.validatedCount)}
                        subtitle={validatedCurrencySub}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="En attente"
                        value={String(kpis.pendingCount)}
                        subtitle={pendingCurrencySub}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Taux validation"
                        value={
                            kpis.totalCount > 0
                                ? `${Math.round((kpis.validatedCount / kpis.totalCount) * 100)} %`
                                : "—"
                        }
                        subtitle={`${kpis.validatedCount} / ${kpis.totalCount}`}
                        icon={<FileCheck className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                        isLoading={isLoading}
                    />
                </div>

                {/* Table */}
                <ReportSection index={1} title="Liste des dépenses">
                    <ExpensesTable
                        data={expenses}
                        canAttachProof={canAttachProof}
                        canValidate={canValidate}
                        canUnvalidate={canUnvalidate}
                        onAttachProof={setProofDialogExpense}
                        onValidate={setDialogExpense}
                        onUnvalidate={setUnvalidateTarget}
                        onViewPhoto={handleViewPhoto}
                    />
                </ReportSection>
            </div>

            {/* Dialog upload */}
            <ValidateExpenseDialog
                expense={dialogExpense}
                open={!!dialogExpense}
                onOpenChange={(open) => !open && setDialogExpense(null)}
                onSubmit={handleSubmitValidation}
                isSubmitting={validateMutation.isPending}
            />

            <AttachProofDialog
                expense={proofDialogExpense}
                open={!!proofDialogExpense}
                onOpenChange={(open) => !open && setProofDialogExpense(null)}
                onSubmit={handleSubmitProof}
                onDeleteProof={handleDeleteProof}
                isSubmitting={attachProofMutation.isPending || deleteProofMutation.isPending}
            />

            {/* Dialog confirmation suppression validation */}
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
                            Les justificatifs associés à « {unvalidateTarget?.name} » seront
                            définitivement supprimés.
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

            {/* Dialog aperçu image / PDF */}
            <Dialog
                open={mediaModal.open}
                onOpenChange={(open) =>
                    !open && setMediaModal((prev) => ({ ...prev, open: false }))
                }
            >
                <DialogContent className="max-w-3xl p-4">
                    <DialogHeader className="flex flex-row items-center justify-between pr-6">
                        <DialogTitle className="text-xs font-semibold truncate">
                            {mediaModal.title}
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
                                title={mediaModal.title}
                                className="w-full h-[70vh] rounded-md border border-border"
                            />
                        ) : (
                            <img
                                src={mediaModal.url}
                                alt={mediaModal.title}
                                className="w-full max-h-[75vh] object-contain rounded-md"
                            />
                        )
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}