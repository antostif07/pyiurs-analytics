"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    RefreshCw,
    FileSpreadsheet,
    FileText,
    Loader2,
    Zap,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { applyOdooZeroStockAdjustmentAction } from "../_lib/reconcile-actions";
import { validateAuditSessionAction } from "../_lib/audits-actions";

interface Props {
    isReadOnly: boolean;
    auditId: string;
    auditReference: string;
    onSyncOdoo: () => Promise<void>;
    isSyncingOdoo?: boolean; // Prop facultative pour le contrôle du spinner depuis le composant parent
    onExportExcel: () => void;
    onExportPDF: () => void;
    onImport: (file: File) => Promise<void>;
    isGeneratingPDF: boolean;
    isImporting: boolean;
    importProgress: { current: number; total: number; isImporting: boolean };
    remainingItemsCount: number;
    totalItemsCount: number;
}

export function ActionBar({
    isReadOnly,
    auditId,
    auditReference,
    onSyncOdoo,
    isSyncingOdoo: externalIsSyncing,
    onExportExcel,
    onExportPDF,
    onImport,
    isGeneratingPDF,
    isImporting,
    importProgress,
    remainingItemsCount,
    totalItemsCount,
}: Props) {
    const router = useRouter();
    const [internalIsSyncing, setInternalIsSyncing] = React.useState(false);
    const [isAdjustingOdoo, setIsAdjustingOdoo] = React.useState(false);
    const [isValidating, setIsValidating] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Combiner l'état de synchronisation externe (prop) ou interne
    const isSyncing = externalIsSyncing ?? internalIsSyncing;

    const handleSync = async () => {
        if (isSyncing) return;
        setInternalIsSyncing(true);
        try {
            await onSyncOdoo();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur de synchronisation.");
        } finally {
            setInternalIsSyncing(false);
        }
    };

    const handleAdjustOdoo = async () => {
        if (isAdjustingOdoo || remainingItemsCount === 0) return;
        setIsAdjustingOdoo(true);
        toast.info("Ajustement direct du stock Odoo à 0 pour les non scannés...");
        try {
            const res = await applyOdooZeroStockAdjustmentAction(auditId);
            if (res.success) {
                toast.success(res.message || "Ajustement Odoo réussi !");
                router.refresh();
            } else {
                toast.error(res.error || "Échec de l'ajustement Odoo.");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur réseau.");
        } finally {
            setIsAdjustingOdoo(false);
        }
    };

    const handleValidate = async () => {
        setIsValidating(true);
        try {
            const res = await validateAuditSessionAction(auditId);
            if (res.success) {
                toast.success("Audit clôturé et verrouillé avec succès !");
                router.refresh();
            } else {
                toast.error(res.error || "Échec de la clôture.");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur réseau.");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
                <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                    title="Mettre à jour les emplacements de vente -1 et métadonnées Odoo"
                >
                    <RefreshCw className={cn("w-4 h-4 text-primary", isSyncing && "animate-spin")} />
                    <span>{isSyncing ? "Resync..." : "Resync Odoo"}</span>
                </Button>
            )}

            <Button
                onClick={onExportExcel}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel (.xlsx)</span>
            </Button>

            <Button
                onClick={onExportPDF}
                disabled={isGeneratingPDF}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
            >
                {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                ) : (
                    <FileText className="w-4 h-4 text-rose-600" />
                )}
                <span>{isGeneratingPDF ? "Génération..." : "Rapport PDF"}</span>
            </Button>

            {!isReadOnly && (
                <>
                    <label className="relative h-9 px-3 rounded-xl text-xs font-semibold bg-muted/30 hover:bg-muted/60 border border-border text-foreground flex items-center gap-1.5 cursor-pointer transition-colors">
                        {isImporting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                            <FileSpreadsheet className="w-4 h-4 text-primary" />
                        )}
                        <span>
                            {isImporting
                                ? `Import ${importProgress.current}/${importProgress.total}...`
                                : "Import Excel"}
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv,.txt"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onImport(file);
                                e.target.value = "";
                            }}
                            disabled={isImporting}
                            className="hidden"
                        />
                    </label>

                    <Button
                        onClick={handleAdjustOdoo}
                        disabled={isAdjustingOdoo || remainingItemsCount === 0}
                        variant="outline"
                        size="sm"
                        className="h-9 px-3.5 rounded-xl text-xs font-bold border-rose-500/40 text-rose-600 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
                    >
                        {isAdjustingOdoo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Zap className="w-4 h-4 text-rose-500" />
                        )}
                        <span>Mettre Stock Odoo à 0</span>
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={isValidating || totalItemsCount === 0}
                                className="h-9 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer shadow-xs"
                            >
                                {isValidating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                <span>{isValidating ? "Clôture..." : "Clôturer l'Audit"}</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card text-card-foreground border-border rounded-2xl max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-base font-bold">
                                    Clôturer l'Audit {auditReference} ?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-muted-foreground font-light">
                                    L'inventaire unitaire sera verrouillé de façon permanente. Les comptages ne pourront plus être modifiés.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 pt-2">
                                <AlertDialogCancel className="h-9 rounded-xl text-xs cursor-pointer">Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleValidate}
                                    className="h-9 rounded-xl text-xs font-semibold bg-emerald-600 text-white cursor-pointer"
                                >
                                    Valider et Clôturer
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </div>
    );
}