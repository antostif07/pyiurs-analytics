"use client";

import { Banknote, Building2, CreditCard, Globe, Smartphone } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DailyClosingReport } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function ClotureMatrixAndPayments({
    report,
}: {
    report: DailyClosingReport;
}) {
    const paymentCards = [
        {
            key: "cash",
            label: "Espèces (Cash)",
            sub: "Paiements caisse",
            total: report.payments.cash.total,
            count: report.payments.cash.count,
            Icon: Banknote,
            tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
        },
        {
            key: "bank",
            label: "Banque",
            sub: "Cartes & virements",
            total: report.payments.bank.total,
            count: report.payments.bank.count,
            Icon: Building2,
            tone: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40",
        },
        {
            key: "mobile",
            label: "Mobile Money",
            sub: "Airtel / Orange / M-Pesa",
            total: report.payments.mobile.total,
            count: report.payments.mobile.count,
            Icon: Smartphone,
            tone: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40",
        },
        {
            key: "onl",
            label: "Online",
            sub: "Paiements Web",
            total: report.payments.onl.total,
            count: report.payments.onl.count,
            Icon: Globe,
            tone: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
        },
    ] as const;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Matrice Magasin × Segment */}
            <div className="xl:col-span-2 rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-semibold text-foreground">
                            Revenus par boutique &amp; segment
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                            Consolidé depuis les lignes de vente POS validées
                        </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground">
                        {fmt(report.segmentTotals.total)} $
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <Table className="w-full text-[11px]">
                        <TableHeader className={HEADER_BG}>
                            <TableRow className={cn("border-none", HEADER_BG)}>
                                <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-left", HEADER_BG)}>
                                    Boutique
                                </TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>
                                    Femme
                                </TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>
                                    Enfant
                                </TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>
                                    Beauty
                                </TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>
                                    Autres
                                </TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/40">
                            {report.shopMatrix.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-6 text-center text-[11px] text-muted-foreground italic">
                                        Aucune boutique disponible.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                report.shopMatrix.map((row) => (
                                    <TableRow key={row.shopId} className="hover:bg-accent/30">
                                        <TableCell className="py-2 px-3 font-medium text-foreground">
                                            {row.shopName}
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {fmt(row.femme)} $
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {fmt(row.enfant)} $
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {fmt(row.beauty)} $
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {fmt(row.autres)} $
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                                            {fmt(row.total)} $
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="bg-muted/50 border-t border-border/80">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell className="py-2 px-3 text-[10px] font-bold uppercase">
                                    Total Segments
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                    {fmt(report.segmentTotals.femme)} $
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                    {fmt(report.segmentTotals.enfant)} $
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                    {fmt(report.segmentTotals.beauty)} $
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                    {fmt(report.segmentTotals.autres)} $
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                                    {fmt(report.segmentTotals.total)} $
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>

            {/* Modes de paiement */}
            <div className="space-y-2.5">
                {paymentCards.map(({ key, label, sub, total, count, Icon, tone }) => (
                    <div
                        key={key}
                        className="rounded-lg border border-border/60 bg-card p-3 shadow-2xs flex items-center justify-between gap-3"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn("p-2 rounded-lg shrink-0", tone)}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-mono font-bold tabular-nums text-foreground">
                                {fmt(total)} $
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                {count} transaction{count > 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}