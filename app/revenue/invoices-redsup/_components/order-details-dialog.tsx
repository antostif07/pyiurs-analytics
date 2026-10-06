// app/revenue/invoices-redsup/_components/order-details-dialog.tsx
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import type { RedsupInvoiceRow } from "../_lib/types";

interface OrderDetailsDialogProps {
    invoice: RedsupInvoiceRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR", {
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

    const total = invoice.lines.reduce((s, l) => s + l.subtotal, 0);
    const totalQty = invoice.lines.reduce((s, l) => s + l.qty, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <Package className="w-4 h-4 text-pink-600" />
                        Détail des articles RedSup
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        {invoice.orderName} · {invoice.date} ·{" "}
                        {invoice.partnerName}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                        <Table className="w-full text-[11px]">
                            <TableHeader className={HEADER_BG}>
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left min-w-[220px]">
                                        Produit
                                    </TableHead>
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-center min-w-[80px]">
                                        Qté
                                    </TableHead>
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-center min-w-[100px]">
                                        Prix unit.
                                    </TableHead>
                                    <TableHead className="py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-right min-w-[100px]">
                                        Sous-total
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-border/40">
                                {invoice.lines.map((line, idx) => (
                                    <TableRow
                                        key={`${line.productId}-${idx}`}
                                        className="hover:bg-accent/30 transition-colors border-b border-border/40"
                                    >
                                        <TableCell className="py-2 px-3 text-left">
                                            <span className="font-medium text-foreground">
                                                {line.productName}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-center font-mono tabular-nums text-muted-foreground">
                                            {line.qty}
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-center font-mono tabular-nums text-muted-foreground">
                                            {fmt(line.unitPrice)} $
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-foreground">
                                            {fmt(line.subtotal)} $
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>

                            <TableFooter className="bg-muted/50 border-t border-border/80">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider">
                                        Total ({invoice.lines.length} ligne
                                        {invoice.lines.length > 1 ? "s" : ""})
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                        {totalQty}
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-center text-muted-foreground">
                                        —
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-sky-700 dark:text-sky-300">
                                        {fmt(total)} $
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