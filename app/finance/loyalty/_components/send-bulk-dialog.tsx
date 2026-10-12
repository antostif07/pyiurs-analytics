// app/finance/loyalty/_components/send-bulk-dialog.tsx
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
import { AlertTriangle, Loader2, Send } from "lucide-react";

interface SendBulkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderCount: number;
    totalPoints: number;
    onConfirm: () => Promise<void>;
    isSubmitting: boolean;
}

export default function SendBulkDialog({
    open,
    onOpenChange,
    orderCount,
    totalPoints,
    onConfirm,
    isSubmitting,
}: SendBulkDialogProps) {
    const handleClose = (next: boolean) => {
        if (!next && !isSubmitting) onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-border/60 pb-3">
                    <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <Send className="w-4 h-4 text-sky-600" />
                        Envoyer les points à {orderCount} client
                        {orderCount > 1 ? "s" : ""}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground/80">
                        Un message WhatsApp sera envoyé à chaque client
                        éligible. Total : {totalPoints} point
                        {totalPoints > 1 ? "s" : ""} à créditer.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3">
                    <div className="rounded-md px-3 py-2 text-[11px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-semibold">
                                Attention — envoi séquentiel
                            </p>
                            <p className="opacity-80 leading-relaxed">
                                Les messages sont envoyés un par un avec une
                                pause de 300 ms pour respecter les limites de
                                Meta. Cela peut prendre jusqu&apos;à{" "}
                                {Math.ceil((orderCount * 1.5) / 60)} minute
                                {orderCount > 40 ? "s" : ""}. Ne ferme pas cet
                                onglet.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClose(false)}
                        disabled={isSubmitting}
                        className="h-7 text-[11px]"
                    >
                        Annuler
                    </Button>
                    <Button
                        size="sm"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="h-7 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Send className="w-3 h-3" />
                        )}
                        {isSubmitting
                            ? "Envoi en cours..."
                            : `Envoyer à ${orderCount}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}