"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
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
import type { RedsupInvoiceRow, RedsupLine, RedsupOrderDetails } from "../_lib/types";

interface OrderDetailsDialogProps {
    invoice: RedsupInvoiceRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function OrderDetailsDialog({
    invoice,
    open,
    onOpenChange,
}: OrderDetailsDialogProps) {
    const cacheRef = useRef<Map<number, RedsupOrderDetails>>(new Map());
    const [details, setDetails] = useState<RedsupOrderDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !invoice) return;

        const cached = cacheRef.current.get(invoice.odooOrderId);
        if (cached) {
            setDetails(cached);
            setError(null);
            setLoading(false);
            return;
        }

        const ctrl = new AbortController();
        setLoading(true);
        setError(null);
        setDetails(null);

        fetch(`/api/controls/validation-remise/${invoice.odooOrderId}/details`, {
            signal: ctrl.signal,
        })
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error ?? "Impossible de charger le détail");
                return body as RedsupOrderDetails;
            })
            .then((data) => {
                cacheRef.current.set(invoice.odooOrderId, data);
                setDetails(data);
            })
            .catch((e) => {
                if (e.name !== "AbortError") {
                    setError(e instanceof Error ? e.message : "Erreur de chargement");
                }
            })
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [open, invoice]);

    if (!invoice) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl rounded-xl border-border/60 bg-card p-0 shadow-2xl gap-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
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
                            {invoice.lineCount} ligne{invoice.lineCount > 1 ? "s" : ""} RedSup
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {error && (
                        <div className="text-center py-8 text-xs text-rose-600">{error}</div>
                    )}
                    {details && (
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
                                    {details.allLines.map((line, idx) => (
                                        <LineRow key={`${line.productId}-${idx}`} line={line} />
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-muted/50 border-t border-border/80">
                                    <TableRow className="hover:bg-transparent border-none border-b border-border/40">
                                        <TableCell className="py-2 px-3 text-left">
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
                                                <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                                                Total RedSup
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                            {details.totalRedsupQty}
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-center text-muted-foreground">—</TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-pink-700 dark:text-pink-400">
                                            {fmt(details.totalRedsupAmount)} $
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableCell className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider">
                                            Total commande ({details.allLines.length} ligne{details.allLines.length > 1 ? "s" : ""})
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                            {details.totalOrderQty}
                                        </TableCell>
                                        <TableCell className="py-2 px-3 text-center text-muted-foreground">—</TableCell>
                                        <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-sky-700 dark:text-sky-300">
                                            {fmt(details.totalOrderAmount)} $
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

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
                    {line.isRedsup && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />}
                    <span
                        className={cn("truncate", line.isRedsup ? "font-semibold" : "text-foreground/80")}
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
            <TableCell className={cn("py-2 px-3 text-right font-mono tabular-nums", line.isRedsup ? "font-semibold" : "text-foreground/80")}>
                {fmt(line.subtotal)} $
            </TableCell>
        </TableRow>
    );
}