"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExcelPreviewData } from "../_lib/server/stock-po-service";

interface ExcelPreviewDialogProps {
    poId: number | null;
    field: "x_studio_fichier_excel_ca" | "x_studio_facture_fournisseur" | null;
    fileName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ExcelPreviewDialog({
    poId,
    field,
    fileName,
    open,
    onOpenChange,
}: ExcelPreviewDialogProps) {
    const [data, setData] = useState<ExcelPreviewData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeSheetIdx, setActiveSheetIdx] = useState(0);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!open || !poId || !field) return;

        const ctrl = new AbortController();
        setLoading(true);
        setError(null);
        setData(null);
        setActiveSheetIdx(0);
        setSearch("");

        fetch(`/api/controls/stock-po/${poId}/preview?field=${field}`, {
            signal: ctrl.signal,
        })
            .then(async (res) => {
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error ?? "Impossible de lire le fichier");
                return body as ExcelPreviewData;
            })
            .then(setData)
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err instanceof Error ? err.message : "Erreur de chargement");
                }
            })
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [open, poId, field]);

    const currentSheet = data?.sheets[activeSheetIdx] ?? null;

    const filteredRows = useMemo(() => {
        if (!currentSheet) return [];
        const q = search.trim().toLowerCase();
        if (!q) return currentSheet.rows;
        return currentSheet.rows.filter((row, idx) => {
            if (idx === 0) return true; // conserver l'en-tête
            return row.some((cell) => cell.toLowerCase().includes(q));
        });
    }, [currentSheet, search]);

    const downloadUrl =
        poId && field ? `/api/controls/stock-po/${poId}/file?field=${field}&download=1` : "#";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl rounded-xl border-border/60 bg-card p-5 shadow-2xl">
                <DialogHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between gap-4 pr-6">
                    <div className="min-w-0">
                        <DialogTitle className="text-sm font-semibold flex items-center gap-2 truncate">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{data?.fileName || fileName}</span>
                        </DialogTitle>
                        <DialogDescription className="text-[11px] text-muted-foreground">
                            {currentSheet
                                ? `${currentSheet.totalRows} ligne(s) · ${currentSheet.totalCols} colonne(s)${currentSheet.truncated ? " (aperçu limité à 250 lignes / 30 col.)" : ""
                                }`
                                : "Aperçu tableur Excel"}
                        </DialogDescription>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 shrink-0">
                        <a href={downloadUrl}>
                            <Download className="w-3 h-3" />
                            Télécharger
                        </a>
                    </Button>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && (
                    <div className="flex items-center justify-center h-40 text-xs text-rose-600">
                        {error}
                    </div>
                )}

                {!loading && !error && data && (
                    <div className="space-y-3">
                        {/* Onglets feuilles + recherche */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1">
                                {data.sheets.map((s, idx) => (
                                    <button
                                        key={s.name}
                                        type="button"
                                        onClick={() => setActiveSheetIdx(idx)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors",
                                            activeSheetIdx === idx
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-card text-muted-foreground border-border hover:text-foreground",
                                        )}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-60">
                                <Search className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filtrer dans la feuille..."
                                    className="w-full h-7 pl-7 pr-2.5 rounded-lg border border-border bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>

                        {/* Grille Excel */}
                        {currentSheet && (
                            <div className="rounded-lg border border-border/60 overflow-auto max-h-[62vh]">
                                <table className="w-full text-[11px] border-collapse">
                                    <tbody>
                                        {filteredRows.map((row, rIdx) => (
                                            <tr
                                                key={rIdx}
                                                className={cn(
                                                    "border-b border-border/40",
                                                    rIdx === 0
                                                        ? "bg-slate-900 dark:bg-slate-950 text-white font-semibold sticky top-0 z-10"
                                                        : "hover:bg-accent/30",
                                                )}
                                            >
                                                <td
                                                    className={cn(
                                                        "px-2 py-1.5 text-center font-mono text-[10px] border-r border-border/40 w-9 select-none",
                                                        rIdx === 0
                                                            ? "bg-slate-900 dark:bg-slate-950 text-slate-400"
                                                            : "bg-muted/40 text-muted-foreground",
                                                    )}
                                                >
                                                    {rIdx + 1}
                                                </td>
                                                {row.map((cell, cIdx) => (
                                                    <td
                                                        key={cIdx}
                                                        className="px-2.5 py-1.5 border-r border-border/30 whitespace-nowrap max-w-[260px] truncate"
                                                        title={cell}
                                                    >
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}