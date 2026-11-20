import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import {
    ArrowLeft,
    CheckCircle2,
    DollarSign,
    FileText,
    TrendingDown,
} from "lucide-react";

import { getServerAuth } from "@/lib/supabase/server";
import { isRevenueRole } from "@/lib/auth/roles";
import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fetchClotureDetail } from "../_lib/server/cloture-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Détail Clôture" };

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default async function ClotureDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const [{ id }, auth] = await Promise.all([params, getServerAuth()]);
    if (!auth.user) redirect(`/login?next=/revenue/cloture-vente/${id}`);
    if (!auth.profile || !isRevenueRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const cloture = await fetchClotureDetail(id, auth.profile);
    if (!cloture) notFound();

    const isCompleted = cloture.closure_status === "completed";
    const fallbackIso = new Date().toISOString();
    const opening = new Date(cloture.opening_date ?? cloture.created_at ?? fallbackIso);
    const closing = new Date(cloture.closing_date ?? cloture.created_at ?? fallbackIso);
    const periodLabel =
        opening.toDateString() === closing.toDateString()
            ? format(opening, "dd MMMM yyyy", { locale: fr })
            : `${format(opening, "dd/MM/yyyy")} — ${format(closing, "dd/MM/yyyy")}`;

    const denominations = cloture.cash_denominations ?? [];
    const mainCash = cloture.cash_closure_main_cash ?? [];
    const secondaryCash = cloture.cash_closure_secondary_cash ?? [];

    return (
        <div>
            <ReportPageHeader
                title={`Clôture · ${cloture.shop_name || `Boutique #${cloture.shop_id}`}`}
                subtitle={`Période : ${periodLabel}`}
                badge={{
                    label: isCompleted ? "Terminée" : "En cours",
                    tone: isCompleted ? "emerald" : "amber",
                }}
            >
                <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
                    <Link href="/revenue/cloture-vente/historique">
                        <ArrowLeft className="w-3 h-3" />
                        Historique
                    </Link>
                </Button>
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Ventes Total"
                        value={`${fmt(cloture.total_sales ?? 0)} $`}
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Dépenses"
                        value={`${fmt(cloture.total_expenses ?? 0)} $`}
                        icon={<TrendingDown className="w-3.5 h-3.5" />}
                        iconColor="text-rose-600 dark:text-rose-400"
                        iconBg="bg-rose-50 dark:bg-rose-950/40"
                    />
                    <CeoKpiCard
                        label="Cash Théorique"
                        value={`${fmt(cloture.expected_cash ?? 0)} $`}
                        icon={<FileText className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Différence"
                        value={`${fmt(cloture.difference ?? 0)} $`}
                        subtitle={`Physique : ${fmt(cloture.calculated_cash ?? 0)} $`}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor={
                            Math.abs(cloture.difference ?? 0) < 0.01
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                        }
                        iconBg="bg-muted"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {/* Billeterie + Infos */}
                    <div className="space-y-4">
                        <ReportSection index={1} title="Billeterie">
                            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3 text-xs">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">USD</p>
                                    <div className="space-y-1">
                                        {denominations
                                            .filter((d) => d.currency === "USD")
                                            .map((d) => (
                                                <div key={d.id} className="flex justify-between font-mono">
                                                    <span>{d.denomination} $</span>
                                                    <span>{d.quantity ?? 0} × {fmt(d.amount ?? 0)} $</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                                <div className="border-t border-border/60 pt-2">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">CDF</p>
                                    <div className="space-y-1">
                                        {denominations
                                            .filter((d) => d.currency === "CDF")
                                            .map((d) => (
                                                <div key={d.id} className="flex justify-between font-mono">
                                                    <span>{d.denomination.toLocaleString("fr-FR")} FC</span>
                                                    <span>{d.quantity ?? 0} × {(d.amount ?? 0).toLocaleString("fr-FR")} FC</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                                <div className="border-t border-border/60 pt-2 space-y-1 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Taux</span>
                                        <span className="font-mono font-semibold">{cloture.exchange_rate ?? 0} FC/$</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span>Cash Physique</span>
                                        <span className="font-mono text-sky-600 dark:text-sky-400">
                                            {fmt(cloture.calculated_cash ?? 0)} $
                                        </span>
                                    </div>
                                </div>
                                {cloture.notes && (
                                    <div className="border-t border-border/60 pt-2 text-[11px]">
                                        <p className="text-muted-foreground mb-1">Observations</p>
                                        <p className="rounded bg-muted/40 p-2">{cloture.notes}</p>
                                    </div>
                                )}
                            </div>
                        </ReportSection>
                    </div>

                    {/* Caisses Principale & Secondaire */}
                    <div className="xl:col-span-2 space-y-4">
                        <ReportSection index={2} title="Caisse Principale">
                            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table className="w-full text-[11px]">
                                        <TableHeader className={HEADER_BG}>
                                            <TableRow className={cn("border-none", HEADER_BG)}>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase", HEADER_BG)}>Mode</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Ouv.</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Ventes</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Sorties</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Théorique</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Physique</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-border/40">
                                            {mainCash.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="py-1.5 px-3 font-medium">{r.payment_method_name}</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono">{fmt(r.opening_balance ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">+{fmt(r.daily_sales ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">-{fmt(r.daily_outflows ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono font-semibold">{fmt(r.theoretical_closure ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono font-semibold">{fmt(r.physical_cash ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-center">
                                                        <Badge variant="outline" className="h-5 text-[10px]">
                                                            {r.manager_confirmed && r.financier_confirmed
                                                                ? "Validé"
                                                                : r.manager_confirmed
                                                                    ? "Manager"
                                                                    : r.financier_confirmed
                                                                        ? "Financier"
                                                                        : "En attente"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </ReportSection>

                        <ReportSection index={3} title="Caisse Secondaire — Épargnes">
                            <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table className="w-full text-[11px]">
                                        <TableHeader className={HEADER_BG}>
                                            <TableRow className={cn("border-none", HEADER_BG)}>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase", HEADER_BG)}>Catégorie</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Ouv.</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Entrées</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Sorties</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Clôture</TableHead>
                                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-border/40">
                                            {secondaryCash.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="py-1.5 px-3 font-medium">{r.savings_category_name}</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono">{fmt(r.opening_balance ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">+{fmt(r.savings_inflows ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">-{fmt(r.savings_outflows ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono font-semibold">{fmt(r.closure_balance ?? 0)} $</TableCell>
                                                    <TableCell className="py-1.5 px-3 text-center">
                                                        <Badge variant="outline" className="h-5 text-[10px]">
                                                            {r.validated ? "Validé" : "En attente"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </ReportSection>
                    </div>
                </div>
            </div>
        </div>
    );
}