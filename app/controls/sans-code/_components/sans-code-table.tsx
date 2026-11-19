"use client";

import React, { useMemo, useState } from "react";
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    FileText,
    RotateCcw,
    Search,
} from "lucide-react";
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
import type { SansCodeOrderRow } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function SansCodeTable({ data }: { data: SansCodeOrderRow[] }) {
    const [search, setSearch] = useState("");
    const [hideRefunded, setHideRefunded] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((d) => {
            if (hideRefunded && d.isRefunded) return false;
            if (!q) return true;
            return (
                d.posConfig.toLowerCase().includes(q) ||
                d.invoiceRef.toLowerCase().includes(q) ||
                d.clientName.toLowerCase().includes(q) ||
                d.note.toLowerCase().includes(q)
            );
        });
    }, [data, search, hideRefunded]);

    const grouped = useMemo(() => {
        const tree = new Map<string, Map<string, SansCodeOrderRow[]>>();
        for (const item of filtered) {
            if (!tree.has(item.posConfig)) tree.set(item.posConfig, new Map());
            const dateMap = tree.get(item.posConfig)!;
            if (!dateMap.has(item.date)) dateMap.set(item.date, []);
            dateMap.get(item.date)!.push(item);
        }
        return tree;
    }, [filtered]);

    const toggle = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const expandAll = () => {
        const keys = new Set<string>();
        for (const [pos, dates] of grouped.entries()) {
            keys.add(pos);
            for (const date of dates.keys()) {
                keys.add(`${pos}-${date}`);
            }
        }
        setExpanded(keys);
    };

    const collapseAll = () => setExpanded(new Set());

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune vente sans code sur la période sélectionnée.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {/* Barre outils */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher ticket, client, POS, note..."
                            className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setHideRefunded((v) => !v)}
                        className={cn(
                            "h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors",
                            hideRefunded
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:text-foreground",
                        )}
                    >
                        {hideRefunded ? "Remboursées masquées" : "Masquer remboursées"}
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={expandAll}
                        className="h-7 px-2 text-[10.5px] gap-1"
                    >
                        <ChevronsUpDown className="w-3 h-3" />
                        Tout déplier
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={collapseAll}
                        className="h-7 px-2 text-[10.5px] gap-1"
                    >
                        <ChevronsDownUp className="w-3 h-3" />
                        Tout replier
                    </Button>
                </div>
            </div>

            {/* Tableau hiérarchique POS > Date > Commande */}
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-[11px]">
                        <TableHeader className={HEADER_BG}>
                            <TableRow className={cn("border-none", HEADER_BG)}>
                                <TableHead className={cn("w-9 py-2 px-2", HEADER_BG)} />
                                <TableHead
                                    className={cn(
                                        "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto text-left",
                                        HEADER_BG,
                                    )}
                                >
                                    POS / Date / Commande — Client
                                </TableHead>
                                <TableHead
                                    className={cn(
                                        "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto text-right",
                                        HEADER_BG,
                                    )}
                                >
                                    Qté Sans Code
                                </TableHead>
                                <TableHead
                                    className={cn(
                                        "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto text-right",
                                        HEADER_BG,
                                    )}
                                >
                                    Montant Net
                                </TableHead>
                                <TableHead
                                    className={cn(
                                        "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto text-center",
                                        HEADER_BG,
                                    )}
                                >
                                    Statut Retour
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-border/40">
                            {grouped.size === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="py-8 text-center text-[11px] text-muted-foreground/70 italic"
                                    >
                                        Aucun ticket ne correspond à votre recherche.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                Array.from(grouped.entries()).map(([pos, dates]) => {
                                    const posInvs = Array.from(dates.values()).flat();
                                    const isOpen = expanded.has(pos);

                                    const validInvs = posInvs.filter((i) => !i.isRefunded);
                                    const refundedCount = posInvs.length - validInvs.length;
                                    const posQty = validInvs.reduce((a, b) => a + b.qtySansCode, 0);
                                    const posAmount = validInvs.reduce((a, b) => a + b.amountSansCode, 0);

                                    return (
                                        <React.Fragment key={pos}>
                                            {/* Niveau 1 : POS */}
                                            <TableRow
                                                onClick={() => toggle(pos)}
                                                className="bg-muted/30 hover:bg-muted/50 cursor-pointer font-semibold"
                                            >
                                                <TableCell className="py-2 px-2 text-center">
                                                    {isOpen ? (
                                                        <ChevronDown className="w-3.5 h-3.5 mx-auto" />
                                                    ) : (
                                                        <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 px-3 text-xs font-bold uppercase text-foreground">
                                                    {pos}
                                                    <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                                        ({posInvs.length} ticket{posInvs.length > 1 ? "s" : ""})
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2 px-3 text-right tabular-nums">
                                                    {posQty}
                                                </TableCell>
                                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums">
                                                    {fmt(posAmount)} $
                                                </TableCell>
                                                <TableCell className="py-2 px-3 text-center">
                                                    {refundedCount > 0 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="h-5 px-1.5 text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60"
                                                        >
                                                            {refundedCount} remb.
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>

                                            {isOpen &&
                                                Array.from(dates.entries()).map(([date, invs]) => {
                                                    const dateId = `${pos}-${date}`;
                                                    const isDateOpen = expanded.has(dateId);
                                                    const validDateInvs = invs.filter((i) => !i.isRefunded);
                                                    const dateRefundedCount = invs.length - validDateInvs.length;
                                                    const dateQty = validDateInvs.reduce(
                                                        (a, b) => a + b.qtySansCode,
                                                        0,
                                                    );
                                                    const dateAmount = validDateInvs.reduce(
                                                        (a, b) => a + b.amountSansCode,
                                                        0,
                                                    );

                                                    return (
                                                        <React.Fragment key={dateId}>
                                                            {/* Niveau 2 : Date */}
                                                            <TableRow
                                                                onClick={() => toggle(dateId)}
                                                                className="bg-background hover:bg-accent/20 cursor-pointer"
                                                            >
                                                                <TableCell className="py-1.5 px-2 text-center">
                                                                    {isDateOpen ? (
                                                                        <ChevronDown className="w-3 h-3 mx-auto text-muted-foreground" />
                                                                    ) : (
                                                                        <ChevronRight className="w-3 h-3 mx-auto text-muted-foreground" />
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-1.5 px-3 pl-7">
                                                                    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {date}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                                                                    {dateQty}
                                                                </TableCell>
                                                                <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums font-medium">
                                                                    {fmt(dateAmount)} $
                                                                </TableCell>
                                                                <TableCell className="py-1.5 px-3 text-center text-[10px] text-rose-500">
                                                                    {dateRefundedCount > 0 ? `${dateRefundedCount} remb.` : ""}
                                                                </TableCell>
                                                            </TableRow>

                                                            {/* Niveau 3 : Tickets */}
                                                            {isDateOpen &&
                                                                invs.map((inv) => (
                                                                    <TableRow
                                                                        key={inv.id}
                                                                        className="hover:bg-accent/30 transition-colors"
                                                                    >
                                                                        <TableCell />
                                                                        <TableCell className="py-1.5 px-3 pl-12">
                                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                                <FileText className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                                                                <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                                                                                    {inv.invoiceRef}
                                                                                </span>
                                                                                <span className="text-muted-foreground">
                                                                                    — {inv.clientName}
                                                                                </span>
                                                                                {inv.note && (
                                                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80">
                                                                                        {inv.note}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 px-3 text-right tabular-nums">
                                                                            {inv.qtySansCode}
                                                                        </TableCell>
                                                                        <TableCell
                                                                            className={cn(
                                                                                "py-1.5 px-3 text-right font-mono tabular-nums font-medium",
                                                                                inv.isRefunded && "line-through text-muted-foreground",
                                                                            )}
                                                                        >
                                                                            {fmt(inv.amountSansCode)} $
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 px-3 text-center">
                                                                            {inv.isRefunded ? (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="h-5 px-1.5 text-[10px] gap-1 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60"
                                                                                >
                                                                                    <RotateCcw className="w-2.5 h-2.5" />
                                                                                    Remboursée
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="h-5 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                                                                                >
                                                                                    Validée POS
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                        </React.Fragment>
                                                    );
                                                })}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}