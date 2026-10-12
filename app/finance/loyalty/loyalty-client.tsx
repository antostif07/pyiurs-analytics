// app/finance/loyalty/loyalty-client.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Coins,
    Send,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Button } from "@/components/ui/button";

import LoyaltyFilters from "./_components/loyalty-filters";
import LoyaltyTable from "./_components/loyalty-table";
import SendBulkDialog from "./_components/send-bulk-dialog";
import { useLoyaltyToday } from "./_lib/hooks/use-loyalty-today";
import {
    useSendLoyalty,
    useSendBulkLoyalty,
} from "./_lib/hooks/use-send-loyalty";
import { getTodayRangeKinshasa } from "./_lib/loyalty-helpers";
import type { LoyaltyKpis, LoyaltyOrderRow } from "./_lib/types";

const FALLBACK_KPIS: LoyaltyKpis = {
    totalOrders: 0,
    totalAmount: 0,
    sentCount: 0,
    pendingCount: 0,
    invalidPhoneCount: 0,
    totalPointsEarned: 0,
};

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function LoyaltyClient() {
    const searchParams = useSearchParams();
    const today = getTodayRangeKinshasa().from;
    const selectedDate = searchParams.get("date") ?? today;

    const { data, isLoading, isFetching, refetch, dataUpdatedAt } =
        useLoyaltyToday();
    const isBusy = isLoading || isFetching;

    const sendOne = useSendLoyalty();
    const sendBulk = useSendBulkLoyalty();

    const [sendingOrderId, setSendingOrderId] = useState<number | null>(null);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

    const orders = data?.orders ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;

    // Commandes éligibles pour l'envoi groupé
    const eligibleOrders = orders.filter(
        (o) => !o.isSent && o.isPhoneValid && o.pointsEarned > 0,
    );
    const eligiblePoints = eligibleOrders.reduce(
        (s, o) => s + o.pointsEarned,
        0,
    );

    const handleRefresh = async () => {
        await refetch();
        toast.success("Factures actualisées");
    };

    const handleSendOne = async (order: LoyaltyOrderRow) => {
        setSendingOrderId(order.odooOrderId);
        try {
            const res = await sendOne.mutateAsync(order.odooOrderId);
            toast.success(
                `+${res.pointsEarned} point${res.pointsEarned > 1 ? "s" : ""} à ${order.partnerName ?? "client"} (solde : ${res.newBalance})`,
            );
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
        } finally {
            setSendingOrderId(null);
        }
    };

    const handleBulkConfirm = async () => {
        try {
            const res = await sendBulk.mutateAsync(
                eligibleOrders.map((o) => o.odooOrderId),
            );
            setBulkDialogOpen(false);

            if (res.failed === 0) {
                toast.success(
                    `${res.succeeded} message${res.succeeded > 1 ? "s" : ""} envoyé${res.succeeded > 1 ? "s" : ""}`,
                );
            } else {
                toast.warning(
                    `${res.succeeded} envoyés · ${res.failed} échec${res.failed > 1 ? "s" : ""}`,
                );
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec de l'envoi groupé");
        }
    };

    const validationRate =
        kpis.totalOrders > 0
            ? Math.round((kpis.sentCount / kpis.totalOrders) * 100)
            : 0;

    return (
        <div>
            <ReportPageHeader
                title="Points de Fidélité"
                subtitle="Envoi des points clients par WhatsApp"
                badge={{ label: "Live Odoo", tone: "sky" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isBusy}
                onRefresh={handleRefresh}
            >
                <LoyaltyFilters date={selectedDate} today={today} />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Factures du jour"
                        value={String(kpis.totalOrders)}
                        subtitle={`${fmt(kpis.totalAmount)} $ de CA`}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Envoyés"
                        value={String(kpis.sentCount)}
                        subtitle={`${validationRate} % du total`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="En attente"
                        value={String(kpis.pendingCount)}
                        subtitle={
                            kpis.invalidPhoneCount > 0
                                ? `${kpis.invalidPhoneCount} tél. invalide${kpis.invalidPhoneCount > 1 ? "s" : ""}`
                                : "Prêts à envoyer"
                        }
                        icon={<Send className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Points à créditer"
                        value={`+${kpis.totalPointsEarned}`}
                        subtitle="Total sur la période"
                        icon={<Coins className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                        isLoading={isBusy}
                    />
                </div>

                {/* Alerte tél. invalides */}
                {kpis.invalidPhoneCount > 0 && (
                    <div className="rounded-md px-3 py-2 text-[11px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                            {kpis.invalidPhoneCount} facture
                            {kpis.invalidPhoneCount > 1 ? "s" : ""} ignorée
                            {kpis.invalidPhoneCount > 1 ? "s" : ""} — numéro
                            manquant ou invalide.
                        </span>
                    </div>
                )}

                {/* Table */}
                <ReportSection
                    index={1}
                    title="Factures du jour"
                    actions={
                        <Button
                            size="sm"
                            onClick={() => setBulkDialogOpen(true)}
                            disabled={
                                eligibleOrders.length === 0 ||
                                sendBulk.isPending
                            }
                            className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <Send className="w-3 h-3" />
                            Envoyer tout
                            {eligibleOrders.length > 0 &&
                                ` (${eligibleOrders.length})`}
                        </Button>
                    }
                >
                    <LoyaltyTable
                        data={orders}
                        onSendOne={handleSendOne}
                        isSendingOne={sendOne.isPending}
                        sendingOrderId={sendingOrderId}
                    />
                </ReportSection>
            </div>

            {/* Dialog confirmation bulk */}
            <SendBulkDialog
                open={bulkDialogOpen}
                onOpenChange={setBulkDialogOpen}
                orderCount={eligibleOrders.length}
                totalPoints={eligiblePoints}
                onConfirm={handleBulkConfirm}
                isSubmitting={sendBulk.isPending}
            />
        </div>
    );
}