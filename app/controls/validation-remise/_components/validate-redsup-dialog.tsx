"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Image as ImageIcon, Loader2, ShieldCheck } from "lucide-react";
import type { RedsupInvoiceRow } from "../_lib/types";

interface ValidateRedsupDialogProps {
    invoice: RedsupInvoiceRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    onViewPhoto: (invoice: RedsupInvoiceRow) => void;
    isSubmitting: boolean;
}

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function ValidateRedsupDialog({
    invoice,
    open,
    onOpenChange,
    onConfirm,
    onViewPhoto,
    isSubmitting,
}: ValidateRedsupDialogProps) {
    if (!invoice) return null;

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-w-sm rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-[15px] font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Confirmer la validation
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/90">
                        Voulez-vous valider la remise pour la commande{" "}
                        <span className="font-mono font-semibold text-foreground">
                            {invoice.orderName}
                        </span>{" "}
                        ?
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Client</span>
                        <span className="font-medium truncate">{invoice.partnerName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Montant RedSup</span>
                        <span className="font-mono font-semibold text-pink-600 dark:text-pink-400">
                            {fmt(invoice.totalRedsupAmount)} $
                        </span>
                    </div>
                    {invoice.photoAttachedBy && (
                        <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Photo jointe par</span>
                            <span className="font-medium">{invoice.photoAttachedBy}</span>
                        </div>
                    )}
                    {invoice.hasPhoto && (
                        <div className="pt-1 border-t border-border/50">
                            <button
                                type="button"
                                onClick={() => {
                                    onOpenChange(false);
                                    onViewPhoto(invoice);
                                }}
                                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 text-[11px] font-semibold"
                            >
                                <ImageIcon className="w-3 h-3" />
                                Consulter la photo d&apos;autorisation
                            </button>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => onOpenChange(false)}
                        className="h-7 text-[11px]"
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        disabled={isSubmitting}
                        onClick={onConfirm}
                        className="h-7 text-[11px] gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Check className="w-3 h-3" />
                        )}
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}