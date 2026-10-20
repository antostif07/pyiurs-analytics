// app/inventory/rebalancing/_components/rebalancing-table.tsx
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RebalancingRow, RebalancingSource } from "../_lib/types";

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const fmtMoney = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }) + " $";

interface Props {
    rows: RebalancingRow[];
}

export default function RebalancingTable({ rows }: Props) {
    const totals = rows.reduce(
        (acc, r) => ({
            qty: acc.qty + r.quantity,
            value: acc.value + r.value,
        }),
        { qty: 0, value: 0 },
    );

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className={HEADER_BG}>
                        <TableRow className={cn("border-none", HEADER_BG)}>
                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[120px]">
                                Code-barres
                            </TableHead>
                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[180px]">
                                Produit
                            </TableHead>
                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[130px]">
                                Destination (déficit)
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider min-w-[70px]">
                                Qté
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider min-w-[90px]">
                                Valeur
                            </TableHead>
                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider min-w-[240px]">
                                Sources possibles
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40">
                        {rows.map((r) => (
                            <TableRow
                                key={r.quantId}
                                className="hover:bg-accent/30 transition-colors border-b border-border/40"
                            >
                                <TableCell className="py-1.5 px-3 text-left font-mono text-[10.5px] tabular-nums text-muted-foreground">
                                    {r.barcode ?? "—"}
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-left">
                                    <span
                                        className="font-medium text-foreground truncate max-w-[180px] inline-block"
                                        title={r.productName}
                                    >
                                        {r.productName}
                                    </span>
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-left">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">
                                            {r.shopName ?? "—"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[130px]">
                                            {r.locationName}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-right font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                    {r.quantity}
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-right font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                    {fmtMoney(r.value)}
                                </TableCell>
                                <TableCell className="py-1.5 px-3 text-left">
                                    <SourcesCell sources={r.sources} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>

                    <TableFooter className="bg-muted/60 border-t-2 border-border">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell
                                colSpan={3}
                                className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider"
                            >
                                Total ({rows.length} ligne
                                {rows.length > 1 ? "s" : ""})
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                                {totals.qty}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                                {fmtMoney(totals.value)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-[10px]">
                                <span className="text-muted-foreground/70">
                                    {rows.filter((r) => r.sources.length > 0).length}{" "}
                                    avec source ·{" "}
                                    {rows.filter((r) => r.sources.length === 0).length}{" "}
                                    sans source
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════ */
/* SOURCES CELL — affichage compact des sources                     */
/* ══════════════════════════════════════════════════════════════════ */

function SourcesCell({ sources }: { sources: RebalancingSource[] }) {
    if (sources.length === 0) {
        return (
            <div className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 italic">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Aucune source — produit perdu
            </div>
        );
    }

    const visible = sources.slice(0, 2);
    const rest = sources.length - visible.length;
    const totalAvailable = sources.reduce((s, src) => s + src.quantity, 0);

    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1">
                {visible.map((src) => (
                    <SourceBadge key={src.quantId} source={src} />
                ))}
                {rest > 0 && (
                    <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/30 border-border/60"
                        title={`${rest} autre${rest > 1 ? "s" : ""} source${rest > 1 ? "s" : ""}`}
                    >
                        +{rest}
                    </Badge>
                )}
            </div>
            <div className="text-[9.5px] text-muted-foreground/60 tabular-nums">
                Total disponible : <strong>{totalAvailable}</strong> pcs
            </div>
        </div>
    );
}

function SourceBadge({ source }: { source: RebalancingSource }) {
    // Nom complet en priorité, sinon nom court
    const label =
        source.locationCompleteName?.trim() ||
        source.locationName;
    const hint = [
        source.companyName,
        source.shopName ? `Shop: ${source.shopName}` : null,
        source.locationCompleteName,
        source.isConfigured ? null : "(location non configurée)",
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <Badge
            variant="outline"
            className={cn(
                "h-5 px-1.5 text-[10px] font-semibold gap-1 max-w-[240px]",
                source.isConfigured
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                    : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60",
            )}
            title={hint}
        >
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{label}</span>
            <span className="font-mono opacity-70 shrink-0">
                +{source.quantity}
            </span>
        </Badge>
    );
}