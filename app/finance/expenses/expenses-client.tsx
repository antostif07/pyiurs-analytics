// app/finance/expenses/expenses-client.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, DollarSign, FileCheck } from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import ExpensesFilters from "./_components/expenses-filters";
import ExpensesTable from "./_components/expenses-table";
import ValidateExpenseDialog from "./_components/validate-expense-dialog";
import { useExpenses } from "./_lib/hooks/use-expenses";
import {
    useValidateExpense,
    useUnvalidateExpense,
} from "./_lib/hooks/use-validate-expense";
import { parseExpensesFilters } from "./_lib/filters";
import type { ExpenseRow, ExpensesKpis } from "./_lib/types";

const FALLBACK_KPIS: ExpensesKpis = {
    totalCount: 0,
    totalAmount: 0,
    validatedCount: 0,
    pendingCount: 0,
    validatedAmount: 0,
    pendingAmount: 0,
};

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ExpensesClient() {
    const searchParams = useSearchParams();
    const filters = parseExpensesFilters(
        Object.fromEntries(searchParams.entries()),
    );

    const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useExpenses();
    const isBusy = isLoading || isFetching;

    const validateMutation = useValidateExpense();
    const unvalidateMutation = useUnvalidateExpense();

    const [dialogExpense, setDialogExpense] = useState<ExpenseRow | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    const expenses = data?.expenses ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;
    const categories = data?.categories ?? [];

    const handleRefresh = async () => {
        await refetch();
        toast.success("Dépenses actualisées");
    };

    const handleSubmitValidation = async (file: File, notes?: string) => {
        if (!dialogExpense) return;
        try {
            await validateMutation.mutateAsync({
                odooExpenseId: dialogExpense.odooExpenseId,
                file,
                notes,
            });
            toast.success("Dépense validée");
            setDialogExpense(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
            throw e;
        }
    };

    const handleUnvalidate = async (expense: ExpenseRow) => {
        if (!confirm(`Retirer la validation de « ${expense.name} » ?`)) return;
        try {
            await unvalidateMutation.mutateAsync(expense.odooExpenseId);
            toast.success("Validation retirée");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    return (
        <div>
            <ReportPageHeader
                title="Notes de Frais"
                subtitle="Consultation, validation et suivi des dépenses Odoo"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isBusy}
                onRefresh={handleRefresh}
            >
                <ExpensesFilters
                    from={filters.from}
                    to={filters.to}
                    categoryIds={filters.categoryIds}
                    categories={categories}
                    companyId={filters.companyId}
                    companies={data?.companies ?? []}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Total Dépenses"
                        value={`${fmt(kpis.totalAmount)} $`}
                        subtitle={`${kpis.totalCount} dépense${kpis.totalCount > 1 ? "s" : ""}`}
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Validées"
                        value={String(kpis.validatedCount)}
                        subtitle={`${fmt(kpis.validatedAmount)} $`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="En attente"
                        value={String(kpis.pendingCount)}
                        subtitle={`${fmt(kpis.pendingAmount)} $`}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isBusy}
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
                        isLoading={isBusy}
                    />
                </div>

                {/* Table */}
                <ReportSection index={1} title="Liste des dépenses">
                    <ExpensesTable
                        data={expenses}
                        onValidate={setDialogExpense}
                        onUnvalidate={handleUnvalidate}
                        onViewPhoto={setPhotoUrl}
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

            {/* Dialog photo */}
            <Dialog open={!!photoUrl} onOpenChange={(open) => !open && setPhotoUrl(null)}>
                <DialogContent className="max-w-2xl p-2">
                    {photoUrl && (
                        <img
                            src={photoUrl}
                            alt="Validation"
                            className="w-full h-auto rounded-md"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}