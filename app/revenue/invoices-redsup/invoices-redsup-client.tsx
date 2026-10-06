// app/revenue/invoices-redsup/invoices-redsup-client.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BadgeDollarSign, CheckCircle2, Clock, Receipt } from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import RedsupFilters from "./_components/redsup-filters";
import RedsupTable from "./_components/redsup-table";
import OrderDetailsDialog from "./_components/order-details-dialog";
import ValidateRedsupDialog from "./_components/validate-redsup-dialog";
import { useRedsupInvoices } from "./_lib/hooks/use-redsup-invoices";
import {
    useValidateRedsup,
    useUnvalidateRedsup,
} from "./_lib/hooks/use-validate-redsup";
import { parseRedsupFilters } from "./_lib/filters";
import type { RedsupInvoiceRow, RedsupKpis } from "./_lib/types";

const FALLBACK_KPIS: RedsupKpis = {
    totalOrders: 0,
    totalAmount: 0,
    totalQty: 0,
    validatedCount: 0,
    pendingCount: 0,
};

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function InvoicesRedsupClient() {
    const searchParams = useSearchParams();
    const filters = parseRedsupFilters(
        Object.fromEntries(searchParams.entries()),
    );

    const { data, isLoading, isFetching, refetch, dataUpdatedAt } =
        useRedsupInvoices();
    const isBusy = isLoading || isFetching;

    const validateMutation = useValidateRedsup();
    const unvalidateMutation = useUnvalidateRedsup();

    const [validateTarget, setValidateTarget] = useState<RedsupInvoiceRow | null>(
        null,
    );
    const [detailsTarget, setDetailsTarget] = useState<RedsupInvoiceRow | null>(
        null,
    );
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    const invoices = data?.invoices ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;

    const handleRefresh = async () => {
        await refetch();
        toast.success("Factures RedSup actualisées");
    };

    const handleSubmitValidation = async (file: File) => {
        if (!validateTarget) return;
        try {
            await validateMutation.mutateAsync({
                odooOrderId: validateTarget.odooOrderId,
                file,
            });
            toast.success("Réduction validée");
            setValidateTarget(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
            throw e;
        }
    };

    const handleUnvalidate = async (invoice: RedsupInvoiceRow) => {
        if (
            !confirm(
                `Retirer la validation de « ${invoice.orderName} » ?`,
            )
        )
            return;
        try {
            await unvalidateMutation.mutateAsync(invoice.odooOrderId);
            toast.success("Validation retirée");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec");
        }
    };

    const validationRate =
        kpis.totalOrders > 0
            ? Math.round((kpis.validatedCount / kpis.totalOrders) * 100)
            : 0;

    return (
        <div>
            <ReportPageHeader
                title="Factures RedSup"
                subtitle="Réductions RedSup · validation manager"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isBusy}
                onRefresh={handleRefresh}
            >
                <RedsupFilters filters={filters} />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Commandes RedSup"
                        value={String(kpis.totalOrders)}
                        subtitle={`${kpis.totalQty} article${kpis.totalQty > 1 ? "s" : ""}`}
                        icon={<Receipt className="w-3.5 h-3.5" />}
                        iconColor="text-pink-600 dark:text-pink-400"
                        iconBg="bg-pink-50 dark:bg-pink-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Montant RedSup"
                        value={`${fmt(kpis.totalAmount)} $`}
                        subtitle="Total réductions appliquées"
                        icon={<BadgeDollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Validées"
                        value={String(kpis.validatedCount)}
                        subtitle={`${validationRate} % du total`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="En attente"
                        value={String(kpis.pendingCount)}
                        subtitle="À valider par le manager"
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isBusy}
                    />
                </div>

                {/* Table */}
                <ReportSection
                    index={1}
                    title="Factures contenant des produits RedSup"
                >
                    <RedsupTable
                        data={invoices}
                        onValidate={setValidateTarget}
                        onUnvalidate={handleUnvalidate}
                        onViewDetails={setDetailsTarget}
                        onViewPhoto={setPhotoUrl}
                    />
                </ReportSection>
            </div>

            {/* Dialog détails */}
            <OrderDetailsDialog
                invoice={detailsTarget}
                open={!!detailsTarget}
                onOpenChange={(open) => !open && setDetailsTarget(null)}
            />

            {/* Dialog upload */}
            <ValidateRedsupDialog
                invoice={validateTarget}
                open={!!validateTarget}
                onOpenChange={(open) => !open && setValidateTarget(null)}
                onSubmit={handleSubmitValidation}
                isSubmitting={validateMutation.isPending}
            />

            {/* Dialog photo */}
            <Dialog
                open={!!photoUrl}
                onOpenChange={(open) => !open && setPhotoUrl(null)}
            >
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