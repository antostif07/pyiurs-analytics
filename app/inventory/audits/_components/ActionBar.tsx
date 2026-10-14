// app/inventory/audits/[id]/_components/ActionBar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Zap,
    CheckCircle2,
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { applyOdooZeroStockAdjustmentAction } from "../_lib/reconcile-actions";
import { validateAuditSessionAction } from "../_lib/audits-actions";

interface Props {
    isReadOnly: boolean;
    auditId: string;
    auditReference: string;
    onImport: (file: File) => Promise<void>;
    isImporting: boolean;
    importProgress: { current: number; total: number; isImporting: boolean };
    remainingItemsCount: number;
    totalItemsCount: number;
}

const BTN_OUTLINE =
    "h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium border-border/80 bg-transparent hover:bg-accent/60";
const BTN_ICON = "h-7 w-7 p-0 rounded-md border-border/80 bg-transparent hover:bg-accent/60";
const DIALOG = "max-w-sm gap-4 rounded-xl border-border/60 bg-card p-5 shadow-2xl";
const DIALOG_ACTION = "h-7 rounded-md px-3 text-[11px] font-semibold";

export function ActionBar({
    isReadOnly,
    auditId,
    auditReference,
    onImport,
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

    const handleAdjustOdoo = async () => {
        if (isAdjustingOdoo || remainingItemsCount === 0) return;
        setIsAdjustingOdoo(true);
        toast.info("Ajustement du stock Odoo à 0 pour les non scannés...");
        try {
            const res = await applyOdooZeroStockAdjustmentAction(auditId);
            if (res.success) {
                toast.success(res.message || "Ajustement Odoo réussi");
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
                toast.success("Audit clôturé et verrouillé");
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

    if (isReadOnly) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* ─── Outils secondaires ─── */}
            <Button asChild variant="outline" size="sm" className={BTN_OUTLINE}>
                <Link href={`/inventory/audits/${auditId}/sold-elsewhere`}>
                    <PackageSearch className="w-3 h-3 text-muted-foreground" />
                    <span className="hidden sm:inline">Vendus ailleurs</span>
                    <span className="sm:hidden">Vendus</span>
                </Link>
            </Button>

            <Button
                variant="outline"
                size="sm"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className={BTN_OUTLINE}
                title="Importer une liste de codes-barres scannés (Excel/CSV)"
            >
                {isImporting ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : (
                    <Upload className="w-3 h-3 text-muted-foreground" />
                )}
                <span>
                    {isImporting
                        ? `${importProgress.current}/${importProgress.total}`
                        : "Importer"}
                </span>
            </Button>
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
                disabled={isImporting}
                className="hidden"
            />

            {/* ─── Actions sensibles à droite ─── */}
            <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-auto">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            disabled={
                                isAdjustingOdoo || remainingItemsCount === 0
                            }
                            variant="outline"
                            size="sm"
                            className={cn(
                                "h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium",
                                "border-rose-200/60 dark:border-rose-800/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30",
                            )}
                            title={
                                remainingItemsCount === 0
                                    ? "Aucun article restant à ajuster"
                                    : `Passer à 0 le stock Odoo de ${remainingItemsCount} article${plural} non scanné${plural}`
                            }
                        >
                            {isAdjustingOdoo ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Zap className="w-3 h-3" />
                            )}
                            <span className="hidden md:inline">
                                Ajuster à 0
                            </span>
                            <span className="md:hidden">Zéro</span>
                        </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent className={DIALOG}>
                        <AlertDialogHeader className="gap-2 text-left">
                            <AlertDialogTitle className="text-[14px] font-semibold">
                                Ajuster le stock Odoo à 0 ?
                            </AlertDialogTitle>
                            <AlertDialogDescription
                                asChild
                                className="text-[11px] leading-relaxed text-muted-foreground"
                            >
                                <div className="space-y-3">
                                    <p>
                                        Le stock Odoo de{" "}
                                        <span className="font-medium text-foreground">
                                            {remainingItemsCount} article{plural}{" "}
                                            non scanné{plural}
                                        </span>{" "}
                                        sera passé à 0. Les {scannedCount}{" "}
                                        articles scannés ne seront pas modifiés.
                                    </p>
                                    <div className="flex items-start gap-2 rounded-md border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-rose-600 dark:text-rose-400">
                                        <TriangleAlert className="mt-px w-3.5 h-3.5 shrink-0" />
                                        <span className="text-[11px]">
                                            Cette action est irréversible.
                                        </span>
                                    </div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="h-7 px-3 text-[11px] mt-0">
                                Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleAdjustOdoo}
                                className={cn(
                                    DIALOG_ACTION,
                                    "bg-rose-600 hover:bg-rose-700 text-white",
                                )}
                            >
                                Ajuster le stock
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div
                    className="hidden sm:block h-4 w-px bg-border"
                    aria-hidden="true"
                />

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            disabled={isValidating || totalItemsCount === 0}
                            className={cn(
                                "h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-semibold",
                                "bg-emerald-600 text-white hover:bg-emerald-500",
                            )}
                        >
                            {isValidating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>
                                {isValidating ? "Clôture..." : "Clôturer"}
                            </span>
                        </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent className={DIALOG}>
                        <AlertDialogHeader className="gap-2 text-left">
                            <AlertDialogTitle className="text-[14px] font-semibold">
                                Clôturer l&apos;audit {auditReference} ?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-[11px] leading-relaxed text-muted-foreground">
                                L&apos;inventaire sera verrouillé de façon
                                permanente. Les comptages ne pourront plus être
                                modifiés.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="h-7 px-3 text-[11px] mt-0">
                                Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleValidate}
                                className={cn(
                                    DIALOG_ACTION,
                                    "bg-emerald-600 hover:bg-emerald-500 text-white",
                                )}
                            >
                                Clôturer l&apos;audit
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}