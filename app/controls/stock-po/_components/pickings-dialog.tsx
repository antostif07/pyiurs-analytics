"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockPoRow } from "../_lib/types";

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const PICKING_STATE: Record<string, { label: string; cls: string }> = {
    done: {
        label: "Fait",
        cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60",
    },
    assigned: {
        label: "Prêt",
        cls: "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60",
    },
    waiting: {
        label: "En attente",
        cls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60",
    },
    confirmed: {
        label: "Confirmé",
        cls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60",
    },
    cancel: {
        label: "Annulé",
        cls: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60",
    },
};

export default function PickingsDialog({
    order,
    open,
    onOpenChange,
}: {
    order: StockPoRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="border-b border-border/60 pb-3">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        Bons de réception (stock.picking) · {order.name}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground">
                        {order.partnerName} · {order.pickings.length} transfert
                        {order.pickings.length > 1 ? "s" : ""} lié
                        {order.pickings.length > 1 ? "s" : ""} par origin
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-border/60 overflow-hidden mt-2">
                    <Table className="w-full text-[11px]">
                        <TableHeader className={HEADER_BG}>
                            <TableRow className={cn("border-none", HEADER_BG)}>
                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase", HEADER_BG)}>Référence</TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase", HEADER_BG)}>Type</TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase", HEADER_BG)}>Destination</TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Prévu</TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Fait le</TableHead>
                                <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/40">
                            {order.pickings.map((pk) => {
                                const st = PICKING_STATE[pk.state] ?? {
                                    label: pk.state,
                                    cls: "text-muted-foreground bg-muted/40",
                                };
                                return (
                                    <TableRow key={pk.id} className="hover:bg-accent/30">
                                        <TableCell className="py-2 px-3 font-mono font-semibold">{pk.name}</TableCell>
                                        <TableCell className="py-2 px-3 text-muted-foreground">{pk.pickingTypeName}</TableCell>
                                        <TableCell className="py-2 px-3">{pk.locationDestName}</TableCell>
                                        <TableCell className="py-2 px-3 text-center tabular-nums">{pk.scheduledDate || "—"}</TableCell>
                                        <TableCell className="py-2 px-3 text-center tabular-nums">{pk.dateDone || "—"}</TableCell>
                                        <TableCell className="py-2 px-3 text-center">
                                            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-semibold", st.cls)}>
                                                {st.label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}