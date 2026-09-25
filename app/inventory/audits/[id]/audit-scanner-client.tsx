"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
    StockAudit,
    StockAuditItem,
} from "../_lib/types";
import { ActionBar } from "../_components/ActionBar";
import { forceMarkItemAsFoundAction } from "../_lib/reconcile-actions";
import { syncAuditStockSnapshotAction } from "../_lib/audits-actions";
import { useAuditItems } from "../_lib/hooks/useAuditItems";
import { AuditDataTable } from "../_components/AuditDataTable";
import { useAuditScanner } from "../_lib/hooks/useAuditScanner";
import { useAuditImport } from "../_lib/hooks/useAuditImport";
import { useAuditExport } from "../_lib/hooks/useAuditExport";
import { StatusBadge } from "../_components/StatusBadge";
import { LaserScanZone } from "../_components/LaserScanZone";
import { KpiDashboard } from "../_components/KpiDashboard";
import { computeAuditStats } from "../_lib/helpers";

interface Props {
    audit: StockAudit;
    initialItems: StockAuditItem[];
}

export function AuditScannerClient({ audit, initialItems }: Props) {
    const router = useRouter();
    const isReadOnly = audit.status === "validated";

    /* ─── Source de vérité : tous les items de l'audit ─── */
    const {
        items,
        setItems,
        updateItemOptimistic,
        totalItemsCount,
        scannedItemsCount,
        remainingItemsCount,
        soldElsewhereCount,
        totalDiffValue,
        scannedValuation,
        totalValuation,
        progressPercent,
    } = useAuditItems(initialItems);

    /* ─── State pour les items filtrés (remontés par AuditDataTable) ─── */
    const [filteredItems, setFilteredItems] = useState<StockAuditItem[]>(items);

    /* Quand les items bruts changent (scan, sync, import), reset le filtre */
    useEffect(() => {
        setFilteredItems(items);
    }, [items]);

    /* Callback stable pour recevoir les items filtrés du tableau */
    const handleFilteredChange = useCallback((filtered: StockAuditItem[]) => {
        setFilteredItems(filtered);
    }, []);

    /* KPIs recalculés à partir des items FILTRÉS */
    const filteredStats = useMemo(
        () => computeAuditStats(filteredItems),
        [filteredItems]
    );

    /* Est-ce qu'un filtre est actif ? (pour l'indicateur visuel) */
    const isFiltered = filteredItems.length !== items.length;

    /* ─── Scan unitaire ─── */
    const handleScanSuccess = useCallback(
        (cleanCode: string, scannedItem: StockAuditItem) => {
            setItems((prev) => {
                const exists = prev.some(
                    (i) => i.internal_barcode.toUpperCase() === cleanCode
                );
                if (exists) {
                    return prev.map((i) =>
                        i.internal_barcode.toUpperCase() === cleanCode
                            ? {
                                ...i,
                                counted_qty: 1,
                                scanned_at: new Date().toISOString(),
                            }
                            : i
                    );
                }
                return [scannedItem, ...prev];
            });
        },
        [setItems]
    );

    /* ─── Hooks spécialisés ─── */
    const {
        inputRef,
        barcodeInput,
        setBarcodeInput,
        isScanning,
        soundEnabled,
        setSoundEnabled,
        handleScanSubmit,
    } = useAuditScanner(audit.id, isReadOnly, handleScanSuccess);

    const { processExcel, importProgress } = useAuditImport(
        audit.id,
        router.refresh
    );
    const { handleExportExcel, handleExportPDF, isGeneratingPDF } =
        useAuditExport(audit, items);

    /* ─── États locaux ─── */
    const [actionProcessingId, setActionProcessingId] = useState<string | null>(
        null
    );
    const [isSyncingOdoo, setIsSyncingOdoo] = useState(false);

    /* ─── Handlers ─── */
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
                    toast.success(
                        `Article '${item.product_name}' déclaré scanné (1/1) !`
                    );
                    updateItemOptimistic(item.id, (i) => ({
                        ...i,
                        counted_qty: 1,
                        scanned_at: new Date().toISOString(),
                    }));
                } else {
                    toast.error(res.error || "Échec de la validation.");
                }
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Erreur réseau."
                );
            } finally {
                setActionProcessingId(null);
            }
        },
        [audit.id, updateItemOptimistic]
    );

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
            <div className="border-b border-border pb-3 flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                <div className="min-w-0">
                    <Link
                        href="/inventory/audits"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors"
                    >
                        <ArrowLeft size={11} /> Retour aux audits
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-lg sm:text-xl font-bold text-foreground font-mono uppercase leading-tight">
                            {audit.reference}
                        </h1>
                        <StatusBadge
                            isReadOnly={isReadOnly}
                            isCompleted={audit.status === "completed"}
                        />
                    </div>
                    <div className="text-[11px] text-muted-foreground font-light mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Store className="w-3 h-3 text-primary" />
                            {audit.shop_name}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>
                            Périmètre :{" "}
                            <strong className="text-foreground">
                                {audit.department || "Tous"}
                            </strong>
                        </span>
                    </div>
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
                    /* ⚠️ COMPTEURS GLOBAUX — les actions s'appliquent à TOUS les items */
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

            {/* DASHBOARD KPIs — réactifs aux filtres */}
            <div className="space-y-2">
                {isFiltered && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold uppercase tracking-wider">
                            KPIs filtrés
                        </span>
                        <span>
                            {filteredItems.length} / {totalItemsCount} articles
                            visibles selon les filtres actifs
                        </span>
                    </div>
                )}
                <KpiDashboard
                    scanned={filteredStats.scannedItemsCount}
                    total={filteredStats.totalItemsCount}
                    remaining={filteredStats.remainingItemsCount}
                    soldElsewhere={filteredStats.soldElsewhereCount}
                    totalDiffValue={filteredStats.totalDiffValue}
                    scannedValuation={filteredStats.scannedValuation}
                    totalValuation={filteredStats.totalValuation}
                    progressPercent={filteredStats.progressPercent}
                />
            </div>

            {/* TABLEAU DES ARTICLES */}
            <AuditDataTable
                audit={audit}
                items={items}
                isReadOnly={isReadOnly}
                actionProcessingId={actionProcessingId}
                onForceMarkFound={handleForceMarkFound}
                onFilteredChange={handleFilteredChange}
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