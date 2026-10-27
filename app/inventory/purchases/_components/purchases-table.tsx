// app/inventory/purchases/_components/purchases-table.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Search,
} from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { IncomingReceipt, ReceiptStatus } from "../_lib/types";

const STATUS_STYLES: Record<ReceiptStatus, string> = {
    Done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
    Ready: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
    Late: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
    Waiting:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
    Draft: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<ReceiptStatus, string> = {
    Done: "Reçu",
    Ready: "Prêt",
    Late: "En retard",
    Waiting: "En attente",
    Draft: "Brouillon",
};

function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    } catch {
        return "—";
    }
}

function fmtQty(n: number): string {
    return n.toLocaleString("fr-FR");
}

interface Props {
    rows: IncomingReceipt[];
}

export default function PurchasesTable({ rows }: Props) {
    const [search, setSearch] = useState("");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            return (
                r.pickingRef.toLowerCase().includes(q) ||
                r.originPO.toLowerCase().includes(q) ||
                r.supplier.toLowerCase().includes(q) ||
                r.carrier.toLowerCase().includes(q)
            );
        });
    }, [rows, search]);

    // Reset page quand la recherche change
    useEffect(() => {
        setPageIndex(0);
    }, [search]);

    // Pagination
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safeIndex = Math.min(pageIndex, pageCount - 1);
    const paged = useMemo(() => {
        const start = safeIndex * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, safeIndex, pageSize]);

    const totals = useMemo(() => {
        return filtered.reduce(
            (acc, r) => {
                acc.expected += r.totalQtyExpected;
                acc.received += r.totalQtyReceived;
                return acc;
            },
            { expected: 0, received: 0 },
        );
    }, [filtered]);

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            {/* Barre de recherche locale */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Réf WH, PO, fournisseur, transporteur…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-7 pl-7 pr-2 text-[11px] bg-secondary/60 border border-border rounded-lg text-foreground/80 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
                <span className="text-[10px] text-muted-foreground">
                    {filtered.length} / {rows.length}
                </span>
            </div>

            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="py-2 px-3 text-left text-white sticky left-0 z-20 bg-[#101c30] border-r border-slate-700 min-w-[130px] text-[10px] font-bold uppercase tracking-wider">
                                Réf Transfert
                            </TableHead>
                            <TableHead className="py-2 px-3 text-center text-white text-[10px] font-bold uppercase tracking-wider min-w-[110px]">
                                Statut
                            </TableHead>
                            <TableHead className="py-2 px-3 text-left text-white text-[10px] font-bold uppercase tracking-wider min-w-[150px]">
                                Fournisseur
                            </TableHead>
                            <TableHead className="py-2 px-3 text-left text-white text-[10px] font-bold uppercase tracking-wider min-w-[110px]">
                                PO Origine
                            </TableHead>
                            <TableHead className="py-2 px-3 text-left text-white text-[10px] font-bold uppercase tracking-wider min-w-[120px]">
                                Transporteur
                            </TableHead>
                            <TableHead className="py-2 px-3 text-center text-white text-[10px] font-bold uppercase tracking-wider min-w-[150px]">
                                Quantités (Reçu / Attendu)
                            </TableHead>
                            <TableHead className="py-2 px-3 text-center text-white text-[10px] font-bold uppercase tracking-wider min-w-[90px]">
                                Date Prévue
                            </TableHead>
                            <TableHead className="py-2 px-3 text-center text-white text-[10px] font-bold uppercase tracking-wider min-w-[90px]">
                                Date Réelle
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {paged.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground text-xs italic"
                                >
                                    Aucun bon d&apos;entrée en stock ne
                                    correspond à votre recherche.
                                </td>
                            </tr>
                        ) : (
                            paged.map((r) => (
                                <tr
                                    key={r.pickingId}
                                    className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                                >
                                    <td className="py-1.5 px-3 font-bold italic text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                        {r.pickingRef}
                                    </td>
                                    <td className="py-1.5 px-3 text-center">
                                        <span
                                            className={cn(
                                                "inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                                STATUS_STYLES[r.status],
                                            )}
                                        >
                                            {STATUS_LABEL[r.status]}
                                        </span>
                                    </td>
                                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                                        {r.supplier}
                                    </td>
                                    <td className="py-1.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                                        {r.originPO}
                                    </td>
                                    <td className="py-1.5 px-3 text-muted-foreground font-medium">
                                        {r.carrier}
                                    </td>
                                    <td className="py-1.5 px-3 text-center">
                                        <div className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {fmtQty(r.totalQtyReceived)}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                                            <span className="text-muted-foreground font-semibold">
                                                {fmtQty(r.totalQtyExpected)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-1.5 px-3 text-center text-muted-foreground font-mono tabular-nums">
                                        {fmtDate(r.scheduledDate)}
                                    </td>
                                    <td className="py-1.5 px-3 text-center text-muted-foreground font-mono tabular-nums">
                                        {fmtDate(r.actualDate)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </TableBody>

                    {/* Footer totals — calculés sur le filtered complet, pas sur la page */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                TOTAL
                            </TableCell>
                            <TableCell
                                colSpan={4}
                                className="py-2 px-3 text-right text-muted-foreground font-normal"
                            >
                                {filtered.length} bon
                                {filtered.length > 1 ? "s" : ""} d&apos;entrée
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums text-slate-900 dark:text-white">
                                <span className="font-black">
                                    {fmtQty(totals.received)}
                                </span>
                                <span className="mx-1 text-muted-foreground">
                                    /
                                </span>
                                <span className="text-muted-foreground">
                                    {fmtQty(totals.expected)}
                                </span>
                            </TableCell>
                            <TableCell
                                colSpan={2}
                                className="py-2 px-3 text-center text-muted-foreground font-normal"
                            >
                                —
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                        Lignes
                    </span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPageIndex(0);
                        }}
                        className="h-7 px-2 text-[11px] bg-secondary/60 border border-border rounded-lg text-foreground/80"
                    >
                        {[10, 25, 50, 100].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                    <span className="text-[11px] text-muted-foreground">
                        · {filtered.length} résultat
                        {filtered.length > 1 ? "s" : ""}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                        disabled={safeIndex === 0}
                        className="h-7 px-2 text-[11px] gap-1"
                    >
                        <ChevronLeft className="w-3 h-3" />
                        Précédent
                    </Button>
                    <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {safeIndex + 1} / {pageCount}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setPageIndex((i) =>
                                Math.min(pageCount - 1, i + 1),
                            )
                        }
                        disabled={safeIndex >= pageCount - 1}
                        className="h-7 px-2 text-[11px] gap-1"
                    >
                        Suivant
                        <ChevronRight className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}