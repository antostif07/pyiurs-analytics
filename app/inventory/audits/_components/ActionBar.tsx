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
    Download,
    ChevronDown,
    Upload,
    PackageSearch,
    TriangleAlert,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { applyOdooZeroStockAdjustmentAction } from "../_lib/reconcile-actions";
import { validateAuditSessionAction } from "../_lib/audits-actions";
import Link from "next/link";

interface Props {
    isReadOnly: boolean;
    auditId: string;
    auditReference: string;
    onSyncOdoo: () => Promise<void>;
    isSyncingOdoo?: boolean;
    onExportExcel: () => void;
    onExportPDF: () => void;
    onImport: (file: File) => Promise<void>;
    isGeneratingPDF: boolean;
    isImporting: boolean;
    importProgress: { current: number; total: number; isImporting: boolean };
    remainingItemsCount: number;
    totalItemsCount: number;
}

const BTN =
    "h-8 gap-2 rounded-md px-3 text-xs font-medium shadow-none cursor-pointer [&_svg]:shrink-0";

const BTN_OUTLINE = cn(
    BTN,
    "border-border bg-transparent text-foreground hover:bg-muted"
);

const ICON = "size-3.5 text-muted-foreground";

const DIALOG =
    "max-w-sm gap-4 rounded-lg border-border bg-card p-5 text-card-foreground shadow-lg";

const DIALOG_CANCEL =
    "mt-0 h-8 rounded-md px-3 text-xs font-medium shadow-none cursor-pointer";

const DIALOG_ACTION =
    "h-8 rounded-md px-3 text-xs font-medium shadow-none cursor-pointer";

export function ActionBar({
    isReadOnly,
    auditId,
    auditReference,
    onSyncOdoo,
    isSyncingOdoo = false,
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
    const [isAdjustingOdoo, setIsAdjustingOdoo] = React.useState(false);
    const [isValidating, setIsValidating] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const scannedCount = totalItemsCount - remainingItemsCount;
    const plural = remainingItemsCount > 1 ? "s" : "";

    /* ══════════════════════════════════════════════════════════════ */
    /* HANDLERS                                                      */
    /* ══════════════════════════════════════════════════════════════ */

    const handleSync = async () => {
        if (isSyncingOdoo) return;
        try {
            await onSyncOdoo();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Erreur de synchronisation."
            );
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onImport(file);
        e.target.value = "";
    };

    /* ══════════════════════════════════════════════════════════════ */
    /* RENDER                                                        */
    /* ══════════════════════════════════════════════════════════════ */

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* ─────────────── Données : outils secondaires ─────────────── */}
            {!isReadOnly && (
                <Button asChild variant="outline" size="sm" className={BTN_OUTLINE}>
                    <Link href={`/inventory/audits/${auditId}/sold-elsewhere`}>
                        <PackageSearch className={ICON} />
                        Vendus ailleurs
                    </Link>
                </Button>
            )}

            {!isReadOnly && (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isImporting}
                        onClick={() => fileInputRef.current?.click()}
                        className={BTN_OUTLINE}
                        title="Importer une liste de codes-barres scannés depuis Excel/CSV"
                    >
                        {isImporting ? (
                            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        ) : (
                            <Upload className={ICON} />
                        )}
                        {isImporting
                            ? `Import ${importProgress.current}/${importProgress.total}`
                            : "Importer"}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.txt"
                        onChange={handleFileChange}
                        disabled={isImporting}
                        className="hidden"
                    />
                </>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={BTN_OUTLINE}
                        title="Exporter le rapport d'audit"
                    >
                        <Download className={ICON} />
                        Exporter
                        <ChevronDown className="size-3 -ml-0.5 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-52 rounded-md p-1 shadow-md"
                >
                    <DropdownMenuItem
                        onClick={onExportExcel}
                        className="cursor-pointer gap-2 rounded-sm px-2 py-1.5 text-xs"
                    >
                        <FileSpreadsheet className={ICON} />
                        Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={onExportPDF}
                        disabled={isGeneratingPDF}
                        className="cursor-pointer gap-2 rounded-sm px-2 py-1.5 text-xs"
                    >
                        {isGeneratingPDF ? (
                            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        ) : (
                            <FileText className={ICON} />
                        )}
                        {isGeneratingPDF ? "Génération en cours..." : "Rapport PDF"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Resync : icône seule, le libellé passe en infobulle */}
            {!isReadOnly && (
                <Button
                    onClick={handleSync}
                    disabled={isSyncingOdoo}
                    variant="outline"
                    size="icon"
                    className={cn(
                        "size-8 rounded-md border-border bg-transparent shadow-none hover:bg-muted cursor-pointer"
                    )}
                    title="Resynchroniser les métadonnées Odoo (marque, couleur, catégories POS, emplacements -1) sans toucher au stock"
                    aria-label="Resynchroniser les métadonnées Odoo"
                >
                    <RefreshCw
                        className={cn(ICON, isSyncingOdoo && "animate-spin")}
                    />
                </Button>
            )}

            {/* ─────────────── Actions sensibles, alignées à droite ─────────────── */}
            {!isReadOnly && (
                <div className="flex items-center gap-2 sm:ml-auto">
                    {/* Ajustement Odoo */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={isAdjustingOdoo || remainingItemsCount === 0}
                                variant="outline"
                                size="sm"
                                className={cn(
                                    BTN,
                                    "border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive"
                                )}
                                title={
                                    remainingItemsCount === 0
                                        ? "Aucun article restant à ajuster"
                                        : `Passer à 0 le stock Odoo de ${remainingItemsCount} article${plural} non scanné${plural}`
                                }
                            >
                                {isAdjustingOdoo ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <Zap className="size-3.5" />
                                )}
                                Ajuster le stock à 0
                            </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className={DIALOG}>
                            <AlertDialogHeader className="gap-2 text-left">
                                <AlertDialogTitle className="text-sm font-semibold">
                                    Ajuster le stock Odoo à 0 ?
                                </AlertDialogTitle>
                                <AlertDialogDescription
                                    asChild
                                    className="text-xs leading-relaxed text-muted-foreground"
                                >
                                    <div className="space-y-3">
                                        <p>
                                            Le stock Odoo de{" "}
                                            <span className="font-medium text-foreground">
                                                {remainingItemsCount} article{plural}{" "}
                                                non scanné{plural}
                                            </span>{" "}
                                            sera passé à 0. Les {scannedCount} articles
                                            scannés ne seront pas modifiés.
                                        </p>
                                        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                                            <TriangleAlert className="mt-px size-3.5 shrink-0" />
                                            <span>Cette action est irréversible.</span>
                                        </div>
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:space-x-0">
                                <AlertDialogCancel className={DIALOG_CANCEL}>
                                    Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleAdjustOdoo}
                                    className={cn(
                                        DIALOG_ACTION,
                                        "bg-destructive text-white hover:bg-destructive/90"
                                    )}
                                >
                                    Ajuster le stock
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Séparateur */}
                    <div
                        className="hidden h-4 w-px bg-border sm:block"
                        aria-hidden="true"
                    />

                    {/* Clôture : seule action pleine de la barre */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                disabled={isValidating || totalItemsCount === 0}
                                className={cn(
                                    BTN,
                                    "border border-emerald-700/40 bg-emerald-600 text-white hover:bg-emerald-500"
                                )}
                            >
                                {isValidating ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="size-3.5" />
                                )}
                                {isValidating ? "Clôture..." : "Clôturer l'audit"}
                            </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className={DIALOG}>
                            <AlertDialogHeader className="gap-2 text-left">
                                <AlertDialogTitle className="text-sm font-semibold">
                                    Clôturer l&apos;audit {auditReference} ?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
                                    L&apos;inventaire sera verrouillé de façon permanente.
                                    Les comptages ne pourront plus être modifiés.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:space-x-0">
                                <AlertDialogCancel className={DIALOG_CANCEL}>
                                    Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleValidate}
                                    className={cn(
                                        DIALOG_ACTION,
                                        "bg-emerald-600 text-white hover:bg-emerald-500"
                                    )}
                                >
                                    Clôturer l&apos;audit
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
    );
}