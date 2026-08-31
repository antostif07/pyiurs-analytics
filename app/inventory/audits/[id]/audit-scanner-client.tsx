"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { StockAudit, StockAuditItem } from "../_lib/types";
import { ActionBar } from "../_components/ActionBar";
import { forceMarkItemAsFoundAction } from "../_lib/reconcile-actions";
import { syncAuditStockSnapshotAction } from "../_lib/audits-actions";
import { useAuditItems } from "../_lib/hooks/useAuditItems";
import { useAuditScanner } from "../_lib/hooks/useAuditScanner";
import { useAuditImport } from "../_lib/hooks/useAuditImport";
import { useAuditExport } from "../_lib/hooks/useAuditExport";
import { StatusBadge } from "../_components/StatusBadge";
import { LaserScanZone } from "../_components/LaserScanZone";
import { KpiDashboard } from "../_components/KpiDashboard";
import { AuditDataTable } from "../_components/AuditDataTable";

interface Props {
    audit: StockAudit;
    initialItems: StockAuditItem[];
}

export function AuditScannerClient({ audit, initialItems }: Props) {
    const router = useRouter();
    const isReadOnly = audit.status === "validated";

    // 1. Hook de gestion des articles & filtres
    const {
        items,
        setItems,
        updateItemOptimistic,
        paginatedItems,
        currentPage,
        setCurrentPage,
        totalPages,
        filterSearch,
        setFilterSearch,
        statusFilter,
        setStatusFilter,
        totalItemsCount,
        scannedItemsCount,
        remainingItemsCount,
        soldElsewhereCount,
        progressPercent,
        totalDiffValue,
        scannedValuation,
        totalValuation,
    } = useAuditItems(initialItems);

    // 2. Callback de succès du scan unitaire
    const handleScanSuccess = useCallback(
        (cleanCode: string, scannedItem: StockAuditItem) => {
            setItems((prev) => {
                const exists = prev.some((i) => i.internal_barcode.toUpperCase() === cleanCode);
                if (exists) {
                    return prev.map((i) =>
                        i.internal_barcode.toUpperCase() === cleanCode
                            ? { ...i, counted_qty: 1, scanned_at: new Date().toISOString() }
                            : i
                    );
                }
                return [scannedItem, ...prev];
            });
        },
        [setItems]
    );

    // 3. Hooks spécialisés Scanner, Import & Export
    const {
        inputRef,
        barcodeInput,
        setBarcodeInput,
        isScanning,
        soundEnabled,
        setSoundEnabled,
        handleScanSubmit,
    } = useAuditScanner(audit.id, isReadOnly, handleScanSuccess);

    const { processExcel, importProgress } = useAuditImport(audit.id, router.refresh);
    const { handleExportExcel, handleExportPDF, isGeneratingPDF } = useAuditExport(audit, items);

    // États d'actions locales
    const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
    const [isSyncingOdoo, setIsSyncingOdoo] = useState(false);

    // 4. Handler : Déclarer un article sans code-barres comme retrouvé (+1)
    const handleForceMarkFound = useCallback(
        async (item: StockAuditItem) => {
            setActionProcessingId(item.id);
            try {
                const res = await forceMarkItemAsFoundAction(
                    audit.id,
                    item.id,
                    "Article physique validé sans étiquette"
                );
                if (res.success) {
                    toast.success(`Article '${item.product_name}' déclaré scanné (1/1) !`);
                    updateItemOptimistic(item.id, (i) => ({
                        ...i,
                        counted_qty: 1,
                        scanned_at: new Date().toISOString(),
                    }));
                } else {
                    toast.error(res.error || "Échec de la validation.");
                }
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur réseau.");
            } finally {
                setActionProcessingId(null);
            }
        },
        [audit.id, updateItemOptimistic]
    );

    // 5. Handler : Resynchronisation Odoo multi-compagnies
    const handleSyncOdoo = useCallback(async () => {
        if (isSyncingOdoo) return;
        setIsSyncingOdoo(true);
        toast.info("Resynchronisation Odoo multi-compagnies en cours...");
        try {
            const res = await syncAuditStockSnapshotAction(audit.id);
            if (res.success) {
                toast.success(res.message || "Resynchronisation réussie !");
                router.refresh();
            } else {
                toast.error(res.error || "Échec de la resynchronisation.");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur réseau.");
        } finally {
            setIsSyncingOdoo(false);
        }
    }, [audit.id, isSyncingOdoo, router]);

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            {/* EN-TÊTE ET BARRE D'ACTIONS */}
            <div className="border-b border-border pb-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <Link
                        href="/inventory/audits"
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase tracking-wider mb-2 transition-colors"
                    >
                        <ArrowLeft size={12} /> Retour à la liste des audits
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground font-mono uppercase">
                            {audit.reference}
                        </h1>
                        <StatusBadge isReadOnly={isReadOnly} isCompleted={audit.status === "completed"} />
                    </div>
                    <p className="text-xs text-muted-foreground font-light mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Store className="w-3.5 h-3.5 text-primary" /> {audit.shop_name}
                        </span>
                        <span>•</span>
                        <span>
                            Périmètre : <strong>{audit.department || "Tous"}</strong>
                        </span>
                    </p>
                </div>

                <ActionBar
                    isReadOnly={isReadOnly}
                    auditId={audit.id}
                    auditReference={audit.reference}
                    onSyncOdoo={handleSyncOdoo}
                    isSyncingOdoo={isSyncingOdoo}
                    onExportExcel={handleExportExcel}
                    onExportPDF={handleExportPDF}
                    onImport={processExcel}
                    isGeneratingPDF={isGeneratingPDF}
                    isImporting={importProgress.isImporting}
                    importProgress={importProgress}
                    remainingItemsCount={remainingItemsCount}
                    totalItemsCount={totalItemsCount}
                />
            </div>

            {/* ZONE DU PISTOLET LASER */}
            {!isReadOnly && (
                <LaserScanZone
                    inputRef={inputRef}
                    barcodeInput={barcodeInput}
                    setBarcodeInput={setBarcodeInput}
                    isScanning={isScanning}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    onSubmit={handleScanSubmit}
                />
            )}

            {/* DASHBOARD KPIS */}
            <KpiDashboard
                scanned={scannedItemsCount}
                total={totalItemsCount}
                remaining={remainingItemsCount}
                soldElsewhere={soldElsewhereCount}
                totalDiffValue={totalDiffValue}
                scannedValuation={scannedValuation}
                totalValuation={totalValuation}
                progressPercent={progressPercent}
            />

            {/* TABLEAU DES ARTICLES AVEC ACTIONS DIRECTES */}
            <AuditDataTable
                items={items}
                isReadOnly={isReadOnly}
                actionProcessingId={actionProcessingId}
                onForceMarkFound={handleForceMarkFound}
                counts={{
                    all: totalItemsCount,
                    scanned: scannedItemsCount,
                    remaining: remainingItemsCount,
                    sold_elsewhere: soldElsewhereCount,
                }}
            />
        </div>
    );
}