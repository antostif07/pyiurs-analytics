// app/inventory/audits/[id]/audit-scanner-client.tsx
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { StockAudit, StockAuditItem } from "../_lib/types";
import { ActionBar } from "../_components/ActionBar";
import { AuditDataTable } from "../_components/AuditDataTable";
import { KpiDashboard } from "../_components/KpiDashboard";
import { LaserScanZone } from "../_components/LaserScanZone";
import { forceMarkItemAsFoundAction } from "../_lib/reconcile-actions";
import { syncAuditStockSnapshotAction } from "../_lib/audits-actions";
import { useAuditItems } from "../_lib/hooks/useAuditItems";
import { useAuditScanner } from "../_lib/hooks/useAuditScanner";
import { useAuditImport } from "../_lib/hooks/useAuditImport";
import { useAuditExport } from "../_lib/hooks/useAuditExport";
import { computeAuditStats } from "../_lib/helpers";

// ─────────────────────────────────────────────────────────────────────────
// Mapping statut → badge
// ─────────────────────────────────────────────────────────────────────────

type BadgeTone = "emerald" | "amber" | "rose" | "sky" | "violet" | "neutral";

const STATUS_META: Record<
    string,
    { label: string; tone: BadgeTone }
> = {
    draft: { label: "Brouillon", tone: "neutral" },
    in_progress: { label: "Scan en cours", tone: "amber" },
    completed: { label: "À valider", tone: "sky" },
    validated: { label: "Validé & verrouillé", tone: "emerald" },
};

// ─────────────────────────────────────────────────────────────────────────

interface Props {
    audit: StockAudit;
    initialItems: StockAuditItem[];
}

export function AuditScannerClient({ audit, initialItems }: Props) {
    const router = useRouter();
    const isReadOnly = audit.status === "validated";
    const statusMeta = STATUS_META[audit.status] ?? STATUS_META.draft;

    /* ─── Source de vérité : tous les items ─── */
    const {
        items,
        setItems,
        updateItemOptimistic,
        totalItemsCount,
        scannedItemsCount,
        remainingItemsCount,
        soldElsewhereCount,
    } = useAuditItems(initialItems);

    const [filteredItems, setFilteredItems] = useState<StockAuditItem[]>(items);

    useEffect(() => {
        setFilteredItems(items);
    }, [items]);

    const handleFilteredChange = useCallback((filtered: StockAuditItem[]) => {
        setFilteredItems(filtered);
    }, []);

    const filteredStats = useMemo(
        () => computeAuditStats(filteredItems),
        [filteredItems],
    );

    const isFiltered = filteredItems.length !== items.length;

    /* ─── Scan unitaire ─── */
    const handleScanSuccess = useCallback(
        (cleanCode: string, scannedItem: StockAuditItem) => {
            setItems((prev) => {
                const exists = prev.some(
                    (i) => i.internal_barcode.toUpperCase() === cleanCode,
                );
                if (exists) {
                    return prev.map((i) =>
                        i.internal_barcode.toUpperCase() === cleanCode
                            ? {
                                ...i,
                                counted_qty: 1,
                                scanned_at: new Date().toISOString(),
                            }
                            : i,
                    );
                }
                return [scannedItem, ...prev];
            });
        },
        [setItems],
    );

    /* ─── Hooks ─── */
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
        router.refresh,
    );
    const {
        handleExportExcel,
        handleExportPDF,
        isGeneratingPDF,
        isGeneratingExcel,
    } = useAuditExport(audit, items, filteredItems);

    const [actionProcessingId, setActionProcessingId] = useState<string | null>(
        null,
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
                    "Article physique validé sans étiquette",
                );
                if (res.success) {
                    toast.success(
                        `Article '${item.product_name}' déclaré scanné (1/1)`,
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
                    err instanceof Error ? err.message : "Erreur réseau.",
                );
            } finally {
                setActionProcessingId(null);
            }
        },
        [audit.id, updateItemOptimistic],
    );

    const handleSyncOdoo = useCallback(async () => {
        if (isSyncingOdoo) return;
        setIsSyncingOdoo(true);
        toast.info("Resynchronisation Odoo multi-compagnies en cours...");
        try {
            const res = await syncAuditStockSnapshotAction(audit.id);
            if (res.success) {
                toast.success(res.message || "Resynchronisation réussie");
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
        <div>
            {/* ══════════════ HEADER ══════════════ */}
            <ReportPageHeader
                title={audit.reference}
                subtitle={`${audit.shop_name} · Périmètre : ${audit.department || "Tous"}`}
                badge={{ label: statusMeta.label, tone: statusMeta.tone }}
                isLoading={isSyncingOdoo}
                onRefresh={!isReadOnly ? handleSyncOdoo : undefined}
                extraActions={
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                disabled={
                                    isGeneratingPDF ||
                                    isGeneratingExcel ||
                                    items.length === 0
                                }
                                className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                            >
                                {isGeneratingPDF || isGeneratingExcel ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Download className="w-3 h-3" />
                                )}
                                {isGeneratingPDF || isGeneratingExcel
                                    ? "Génération..."
                                    : "Exporter"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56 p-1 rounded-lg shadow-xl"
                        >
                            <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                Vue filtrée ({filteredItems.length})
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => handleExportExcel("filtered")}
                                disabled={isGeneratingExcel || filteredItems.length === 0}
                                className="text-xs py-1.5 cursor-pointer gap-2"
                            >
                                <FileSpreadsheet className="w-3 h-3 text-muted-foreground" />
                                Excel — Vue filtrée
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExportPDF("filtered")}
                                disabled={isGeneratingPDF || filteredItems.length === 0}
                                className="text-xs py-1.5 cursor-pointer gap-2"
                            >
                                {isGeneratingPDF ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                ) : (
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                )}
                                PDF — Vue filtrée
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                Audit complet ({items.length})
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => handleExportExcel("all")}
                                disabled={isGeneratingExcel}
                                className="text-xs py-1.5 cursor-pointer gap-2"
                            >
                                <FileSpreadsheet className="w-3 h-3 text-muted-foreground" />
                                Excel — Audit complet
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExportPDF("all")}
                                disabled={isGeneratingPDF}
                                className="text-xs py-1.5 cursor-pointer gap-2"
                            >
                                {isGeneratingPDF ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                ) : (
                                    <FileText className="w-3 h-3 text-muted-foreground" />
                                )}
                                PDF — Audit complet
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />

            <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 pb-12">
                {/* ══════════════ ACTIONS SECONDAIRES ══════════════ */}
                {!isReadOnly && (
                    <ActionBar
                        isReadOnly={isReadOnly}
                        auditId={audit.id}
                        auditReference={audit.reference}
                        onImport={processExcel}
                        isImporting={importProgress.isImporting}
                        importProgress={importProgress}
                        remainingItemsCount={remainingItemsCount}
                        totalItemsCount={totalItemsCount}
                    />
                )}

                {/* ══════════════ SCANNER ══════════════ */}
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

                {/* ══════════════ KPIs ══════════════ */}
                <div className="space-y-2">
                    {isFiltered && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold uppercase tracking-wider">
                                KPIs filtrés
                            </span>
                            <span>
                                {filteredItems.length} / {totalItemsCount}{" "}
                                articles visibles
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

                {/* ══════════════ TABLE ══════════════ */}
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
        </div>
    );
}