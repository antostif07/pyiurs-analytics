// app/ceo-report/operations/_components/transfer-preview-dialog.tsx
"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, FileText, QrCode } from "lucide-react";
import type { TransferControlRow } from "../transfers/_lib/types";
import { cn } from "@/lib/utils";

interface TransferPreviewDialogProps {
    transfer: TransferControlRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function TransferPreviewDialog({
    transfer,
    open,
    onOpenChange,
}: TransferPreviewDialogProps) {
    if (!transfer) return null;

    const isDocOk = transfer.docCompliance === "conforme";
    const isBarcodeOk = transfer.barcodeCompliance === "scanne";

    const shortfall = transfer.orderedCount - transfer.itemCount;
    const hasShortfall = shortfall > 0;
    const isComplete = shortfall === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Bon de Transfert Odoo TR
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
                            {transfer.date}
                        </span>
                    </div>
                    <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight">
                        {transfer.refTransfert}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        Flux logistique : {transfer.origin} (Central) → {transfer.destination} (Boutique)
                    </DialogDescription>
                </DialogHeader>

                {/* ─── Métriques : Prévu / Expédié / Valeur ─────────────── */}
                <div className="grid grid-cols-3 gap-2 py-3">
                    {/* Prévu */}
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Prévu
                        </span>
                        <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-1">
                            {fmt(transfer.orderedCount)}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                pcs
                            </span>
                        </p>
                    </div>

                    {/* Expédié */}
                    <div
                        className={cn(
                            "rounded-lg border p-2.5",
                            hasShortfall
                                ? "border-amber-200/60 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20"
                                : "border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20",
                        )}
                    >
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Expédié
                        </span>
                        <p
                            className={cn(
                                "text-sm font-bold font-mono tabular-nums mt-1",
                                hasShortfall
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-emerald-700 dark:text-emerald-400",
                            )}
                        >
                            {fmt(transfer.itemCount)}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                pcs
                            </span>
                        </p>
                    </div>

                    {/* Valeur */}
                    <div className="rounded-lg border border-border/60 bg-sky-50/40 dark:bg-sky-950/20 p-2.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Valeur
                        </span>
                        <p className="text-sm font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 mt-1">
                            {fmt(transfer.value)}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                $
                            </span>
                        </p>
                    </div>
                </div>

                {/* ─── Bandeau écart si shortfall ─────────────────────── */}
                {(hasShortfall || isComplete) && (
                    <div
                        className={cn(
                            "rounded-md px-3 py-2 text-[11px] font-semibold flex items-center gap-2",
                            hasShortfall
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
                                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60",
                        )}
                    >
                        {hasShortfall ? (
                            <>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                    Écart : <span className="tabular-nums">{shortfall}</span> pièce{shortfall > 1 ? "s" : ""} non expédiée{shortfall > 1 ? "s" : ""} sur{" "}
                                    <span className="tabular-nums">{transfer.orderedCount}</span>
                                </span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Transfert complet — toutes les pièces expédiées</span>
                            </>
                        )}
                    </div>
                )}

                {/* ─── Statuts d'audit ────────────────────────────────── */}
                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <span className="text-[11px] font-semibold text-foreground">
                                Signature du Bon de Livraison
                            </span>
                        </div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "h-5 px-2 text-[10px] font-semibold",
                                isDocOk
                                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                                    : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60",
                            )}
                        >
                            {isDocOk ? (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                                <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {isDocOk ? "Conforme" : "Manque Signature"}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20">
                        <div className="flex items-center gap-2.5">
                            <QrCode className="w-3.5 h-3.5 text-muted-foreground/70" />
                            <span className="text-[11px] font-semibold text-foreground">
                                Scanning Code-Barres POS
                            </span>
                        </div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "h-5 px-2 text-[10px] font-semibold",
                                isBarcodeOk
                                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                                    : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60",
                            )}
                        >
                            {isBarcodeOk ? (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                                <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {isBarcodeOk ? "Scanné & Renseigné" : "Non Renseigné"}
                        </Badge>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}