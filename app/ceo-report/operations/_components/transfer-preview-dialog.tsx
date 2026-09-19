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
import { TransferControlRow } from "./transfer-control-table.tsx";

interface TransferPreviewDialogProps {
    transfer: TransferControlRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function TransferPreviewDialog({
    transfer,
    open,
    onOpenChange,
}: TransferPreviewDialogProps) {
    if (!transfer) return null;

    const isDocOk = transfer.docCompliance === "conforme";
    const isBarcodeOk = transfer.barcodeCompliance === "scanne";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 shadow-2xl">
                <DialogHeader className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Bon de Transfert Odoo TR
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500">
                            {transfer.date}
                        </span>
                    </div>
                    <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                        {transfer.refTransfert}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Flux logistique : {transfer.origin} (Central) → {transfer.destination} (Boutique)
                    </DialogDescription>
                </DialogHeader>

                {/* Détails Métriques */}
                <div className="grid grid-cols-2 gap-3 py-3">
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Volume Pièces</span>
                        <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                            {transfer.itemCount} pcs
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Valeur Marchandise</span>
                        <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                            {transfer.value.toLocaleString("fr-FR")} $
                        </p>
                    </div>
                </div>

                {/* Statuts d'Audit et Sécurité */}
                <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Signature du Bon de Livraison
                            </span>
                        </div>
                        <Badge
                            variant="outline"
                            className={isDocOk ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"}
                        >
                            {isDocOk ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {isDocOk ? "Conforme" : "Manque Signature"}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="flex items-center gap-2.5">
                            <QrCode className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Scanning Code-Barres POS
                            </span>
                        </div>
                        <Badge
                            variant="outline"
                            className={isBarcodeOk ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"}
                        >
                            {isBarcodeOk ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {isBarcodeOk ? "Scanné & Renseigné" : "Non Renseigné"}
                        </Badge>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}