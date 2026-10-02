// app/ceo-report/operations/_components/transfer-control-table.tsx
"use client";

import React, { useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from "@tanstack/react-table";
import {
    Table, TableBody, TableCell, TableFooter, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransferControlRow } from "../_lib/types";

const fmt = (n: number) => n.toLocaleString("fr-FR");

const STICKY_BG = "bg-card";
const STICKY_HEADER_BG = "bg-slate-900 dark:bg-slate-950";

interface TransferControlTableProps {
    /** ⚠️ REQUIS — le parent doit toujours passer un tableau (éventuellement vide) */
    data: TransferControlRow[];
    onPreview?: (ref: string) => void;
}

export default function TransferControlTable({
    data,
    onPreview,
}: TransferControlTableProps) {
    // ── Totaux dérivés ─────────────────────────────────────────────────
    const totals = useMemo(() => {
        const totalOrdered = data.reduce((s, t) => s + t.orderedCount, 0);
        const totalShipped = data.reduce((s, t) => s + t.itemCount, 0);
        const totalValue = data.reduce((s, t) => s + t.value, 0);
        const conformCount = data.filter((t) => t.docCompliance === "conforme").length;
        const anomalyCount = data.length - conformCount;
        const barcodeOk = data.filter((t) => t.barcodeCompliance === "scanne").length;
        const barcodeMissing = data.length - barcodeOk;
        return {
            totalOrdered,
            totalShipped,
            totalValue,
            conformCount,
            anomalyCount,
            barcodeOk,
            barcodeMissing,
        };
    }, [data]);

    const columns = useMemo<ColumnDef<TransferControlRow>[]>(
        () => {
            const baseColumns: ColumnDef<TransferControlRow>[] = [
                {
                    accessorKey: "refTransfert",
                    header: () => <span className="text-left">Réf. Transfert (Odoo TR)</span>,
                    cell: (info) => (
                        <span className="font-semibold text-foreground">
                            {info.getValue() as string}
                        </span>
                    ),
                },
                {
                    accessorKey: "date",
                    header: () => "Date",
                    cell: (info) => (
                        <span className="text-center tabular-nums">
                            {info.getValue() as string}
                        </span>
                    ),
                },
                {
                    accessorKey: "origin",
                    header: () => "Origine",
                    cell: (info) => <span className="text-center">{info.getValue() as string}</span>,
                },
                {
                    accessorKey: "destination",
                    header: () => "Destination",
                    cell: (info) => (
                        <span className="text-center font-semibold">{info.getValue() as string}</span>
                    ),
                },
                {
                    accessorKey: "orderedCount",
                    header: () => "Prévu",
                    cell: (info) => `${fmt(info.getValue() as number)} pcs`,
                },
                {
                    accessorKey: "itemCount",
                    header: () => "Expédié",
                    cell: (info) => {
                        const shipped = info.getValue() as number;
                        const ordered = info.row.original.orderedCount;
                        const isShort = shipped < ordered;
                        return (
                            <span className={isShort ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                                {fmt(shipped)} pcs
                                {isShort && (
                                    <span className="ml-1 text-[9px] opacity-70">
                                        (−{ordered - shipped})
                                    </span>
                                )}
                            </span>
                        );
                    },
                },
                {
                    accessorKey: "value",
                    header: () => "Valeur ($)",
                    cell: (info) => `${fmt(info.getValue() as number)} $`,
                },
                {
                    accessorKey: "docCompliance",
                    header: () => "Conformité Document",
                    cell: (info) => {
                        const isOk = info.getValue() === "conforme";
                        return <ComplianceBadge ok={isOk} okLabel="Conforme" koLabel="Manque Signature" />;
                    },
                },
                {
                    accessorKey: "barcodeCompliance",
                    header: () => "Validation Codes-Barres",
                    cell: (info) => {
                        const isOk = info.getValue() === "scanne";
                        return <ComplianceBadge ok={isOk} okLabel="Scanné" koLabel="Non Renseigné" />;
                    },
                },
            ]

            if (onPreview) {
                baseColumns.push({
                    id: "actions",
                    header: () => "Action",
                    cell: (info) => (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onPreview(info.row.original.refTransfert)}
                            className="h-6 px-2 text-[10px] gap-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md"
                        >
                            <Eye className="w-3 h-3" />
                            <span>Prévisualiser</span>
                        </Button>
                    ),
                });
            }

            return baseColumns;
        },
        [onPreview],
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    // ✅ Empty state explicite (aucune ligne fantôme)
    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucun transfert sur la période sélectionnée.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className={cn(STICKY_HEADER_BG, "hover:bg-transparent")}>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id} className="border-none hover:bg-transparent">
                                {hg.headers.map((header, idx) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto",
                                            idx === 0
                                                ? cn("text-left sticky left-0 z-20 min-w-[130px]", STICKY_HEADER_BG)
                                                : "text-center min-w-[110px]",
                                        )}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40">
                        {table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="hover:bg-accent/30 transition-colors border-b border-border/40"
                            >
                                {row.getVisibleCells().map((cell, idx) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            "py-1.5 px-3 font-mono tabular-nums",
                                            idx === 0
                                                ? cn("text-left sticky left-0 z-10 border-r border-border/60", STICKY_BG)
                                                : "text-center text-muted-foreground",
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    <TableFooter className="bg-muted/50 border-t border-border/80">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell
                                className={cn(
                                    "py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-foreground sticky left-0 z-10 border-r border-border/60",
                                    "bg-muted/70",
                                )}
                            >
                                Total Cumul Mois
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums text-muted-foreground/60">
                                —
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono text-foreground">
                                P.BC
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono text-foreground">
                                {data.length} TR
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold text-foreground">
                                {fmt(totals.totalOrdered)} pcs
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold text-foreground">
                                {fmt(totals.totalShipped)} pcs
                                {totals.totalShipped < totals.totalOrdered && (
                                    <span className="ml-1 text-[9px] font-normal text-amber-600 dark:text-amber-400">
                                        (−{fmt(totals.totalOrdered - totals.totalShipped)})
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold text-sky-700 dark:text-sky-300 bg-sky-50/40 dark:bg-sky-950/30">
                                {fmt(totals.totalValue)} $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center">
                                <span className="text-[10px] font-semibold">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        {totals.conformCount} conformes
                                    </span>
                                    {totals.anomalyCount > 0 && (
                                        <>
                                            {" / "}
                                            <span className="text-rose-600 dark:text-rose-400">
                                                {totals.anomalyCount} anomalie{totals.anomalyCount > 1 ? "s" : ""}
                                            </span>
                                        </>
                                    )}
                                </span>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center">
                                <span className="text-[10px] font-semibold">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        {totals.barcodeOk} scannés
                                    </span>
                                    {totals.barcodeMissing > 0 && (
                                        <>
                                            {" / "}
                                            <span className="text-rose-600 dark:text-rose-400">
                                                {totals.barcodeMissing} manquant{totals.barcodeMissing > 1 ? "s" : ""}
                                            </span>
                                        </>
                                    )}
                                </span>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center text-muted-foreground/40">
                                —
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}

// ─── Helper badge ─────────────────────────────────────────────────────────
function ComplianceBadge({
    ok,
    okLabel,
    koLabel,
}: {
    ok: boolean;
    okLabel: string;
    koLabel: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                ok
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60",
            )}
        >
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    ok ? "bg-emerald-500" : "bg-rose-500",
                )}
            />
            {ok ? okLabel : koLabel}
        </span>
    );
}