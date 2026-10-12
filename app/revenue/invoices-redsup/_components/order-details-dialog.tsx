// app/revenue/invoices-redsup/_components/order-details-dialog.tsx
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
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
import type { RedsupInvoiceRow, RedsupLine } from "../_lib/types";

interface OrderDetailsDialogProps {
    invoice: RedsupInvoiceRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function OrderDetailsDialog({
    invoice,
    open,
    onOpenChange,
}: OrderDetailsDialogProps) {
    if (!invoice) return null;

    const redsupTotal = invoice.lines.reduce((s, l) => s + l.subtotal, 0);
    const orderTotal = invoice.allLines.reduce((s, l) => s + l.subtotal, 0);
    const orderQty = invoice.allLines.reduce((s, l) => s + l.qty, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <Package className="w-4 h-4 text-pink-600" />
                        Détail de la commande
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80 flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-foreground">
                            {invoice.orderName}
                        </span>
                        <span className="opacity-40">·</span>
                        <span>{invoice.date}</span>
                        <span className="opacity-40">·</span>
                        <span className="truncate">{invoice.partnerName}</span>
                        <span className="opacity-40">·</span>
                        <span className="text-pink-600 dark:text-pink-400 font-semibold">
                            {invoice.lineCount} ligne
                            {invoice.lineCount > 1 ? "s" : ""} RedSup
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                        <Table className="w-full text-[11px]">
                            <TableHeader className={HEADER_BG}>
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left min-w-[260px]">
                                        Produit
                                    </TableHead>
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-center min-w-[80px]">
                                        Qté
                                    </TableHead>
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-center min-w-[100px]">
                                        Prix unit.
                                    </TableHead>
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-right min-w-[110px]">
                                        Sous-total
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-border/40">
                                {invoice.allLines.map((line, idx) => (
                                    <LineRow
                                        key={`${line.productId}-${idx}`}
                                        line={line}
                                    />
                                ))}
                            </TableBody>

                            <TableFooter className="bg-muted/50 border-t border-border/80">
                                {/* Ligne 1 : Total RedSup */}
                                <TableRow className="hover:bg-transparent border-none border-b border-border/40">
                                    <TableCell className="py-2 px-3 text-left">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
                                            <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                                            Total RedSup
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                        {invoice.totalRedsupQty}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center text-muted-foreground">
                                        —
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-pink-700 dark:text-pink-400">
                                        {fmt(redsupTotal)} $
                                    </TableCell>
                                </TableRow>

                                {/* Ligne 2 : Total commande */}
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider">
                                        Total commande
                                        <span className="text-muted-foreground/70 ml-1">
                                            ({invoice.allLines.length} ligne
                                            {invoice.allLines.length > 1
                                                ? "s"
                                                : ""}
                                            )
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                        {orderQty}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center text-muted-foreground">
                                        —
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-sky-700 dark:text-sky-300">
                                        {fmt(orderTotal)} $
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Ligne produit avec highlight RedSup ────────────────────────────

function LineRow({ line }: { line: RedsupLine }) {
    return (
        <TableRow
            className={cn(
                "transition-colors border-b border-border/40",
                line.isRedsup
                    ? "bg-pink-50/40 dark:bg-pink-950/20 hover:bg-pink-100/50 dark:hover:bg-pink-950/30"
                    : "hover:bg-accent/30",
            )}
        >
            <TableCell className="py-2 px-3 text-left">
                <div className="flex items-center gap-2">
                    {line.isRedsup && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                    )}
                    <span
                        className={cn(
                            "truncate",
                            line.isRedsup
                                ? "font-semibold text-foreground"
                                : "text-foreground/80",
                        )}
                        title={line.productName}
                    >
                        {line.productName}
                    </span>
                    {line.isRedsup && (
                        <Badge
                            variant="outline"
                            className="h-4 px-1 text-[9px] font-semibold text-pink-700 dark:text-pink-400 bg-pink-100/60 dark:bg-pink-950/40 border-pink-300/60 dark:border-pink-800/60"
                        >
                            RedSup
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell className="py-2 px-3 text-center font-mono tabular-nums text-muted-foreground">
                {line.qty}
            </TableCell>
            <TableCell className="py-2 px-3 text-center font-mono tabular-nums text-muted-foreground">
                {fmt(line.unitPrice)} $
            </TableCell>
            <TableCell
                className={cn(
                    "py-2 px-3 text-right font-mono tabular-nums",
                    line.isRedsup
                        ? "font-semibold text-foreground"
                        : "text-foreground/80",
                )}
            >
                {fmt(line.subtotal)} $
            </TableCell>
        </TableRow>
    );
}