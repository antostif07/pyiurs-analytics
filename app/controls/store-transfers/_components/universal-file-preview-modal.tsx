"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileSpreadsheet, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UniversalFilePreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string | null;       // URL brute pour fetch du binaire ou affichage iframe/img
    fileName: string;             // Nom d'origine du fichier
    mimeType?: string | null;     // Optionnel si connu
}

interface SheetData {
    name: string;
    rows: string[][];
    totalRows: number;
    totalCols: number;
    truncated: boolean;
}

export default function UniversalFilePreviewModal({
    open,
    onOpenChange,
    fileUrl,
    fileName,
    mimeType,
}: UniversalFilePreviewModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheets, setSheets] = useState<SheetData[] | null>(null);
    const [activeSheetIdx, setActiveSheetIdx] = useState(0);
    const [search, setSearch] = useState("");

    const lowerName = fileName.toLowerCase();
    const isExcelOrCsv =
        lowerName.endsWith(".xlsx") ||
        lowerName.endsWith(".xls") ||
        lowerName.endsWith(".csv") ||
        mimeType?.includes("spreadsheet") ||
        mimeType?.includes("excel") ||
        mimeType?.includes("csv");

    const isPdf =
        lowerName.endsWith(".pdf") || mimeType === "application/pdf";

    const isImage =
        /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerName) ||
        mimeType?.startsWith("image/");

    // Chargement et parsing Excel / CSV côté client si c'est un tableur
    useEffect(() => {
        if (!open || !fileUrl || !isExcelOrCsv) {
            setSheets(null);
            return;
        }

        const ctrl = new AbortController();
        setLoading(true);
        setError(null);
        setActiveSheetIdx(0);
        setSearch("");

        fetch(fileUrl, { signal: ctrl.signal })
            .then(async (res) => {
                if (!res.ok) throw new Error("Impossible de télécharger le fichier pour l'aperçu");
                return res.arrayBuffer();
            })
            .then((buffer) => {
                const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
                const MAX_ROWS = 300;
                const MAX_COLS = 40;

                const parsedSheets: SheetData[] = workbook.SheetNames.map((sheetName) => {
                    const ws = workbook.Sheets[sheetName];
                    const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
                        header: 1,
                        defval: "",
                        raw: false,
                    });

                    const totalRows = rawMatrix.length;
                    const totalCols = rawMatrix.reduce(
                        (max, r) => (Array.isArray(r) ? Math.max(max, r.length) : max),
                        0,
                    );

                    const slicedRows = rawMatrix.slice(0, MAX_ROWS).map((row) => {
                        const arr = Array.isArray(row) ? row : [];
                        const out: string[] = [];
                        const colCount = Math.min(totalCols, MAX_COLS);
                        for (let c = 0; c < colCount; c++) {
                            const cell = arr[c];
                            out.push(cell === null || cell === undefined ? "" : String(cell));
                        }
                        return out;
                    });

                    return {
                        name: sheetName,
                        rows: slicedRows,
                        totalRows,
                        totalCols,
                        truncated: totalRows > MAX_ROWS || totalCols > MAX_COLS,
                    };
                });

                setSheets(parsedSheets);
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    setError(err instanceof Error ? err.message : "Erreur de lecture du tableur");
                }
            })
            .finally(() => setLoading(false));

        return () => ctrl.abort();
    }, [open, fileUrl, isExcelOrCsv]);

    const currentSheet = sheets?.[activeSheetIdx] ?? null;

    const filteredRows = useMemo(() => {
        if (!currentSheet) return [];
        const q = search.trim().toLowerCase();
        if (!q) return currentSheet.rows;
        return currentSheet.rows.filter((row, idx) => {
            if (idx === 0) return true; // Conserver l'en-tête
            return row.some((cell) => cell.toLowerCase().includes(q));
        });
    }, [currentSheet, search]);

    const downloadUrl = fileUrl ? `${fileUrl}${fileUrl.includes("?") ? "&" : "?"}download=1` : "#";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Modal plein écran avec fond semi-transparent prononcé */}
            <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] rounded-2xl border-border/60 bg-card/95 backdrop-blur-md p-6 shadow-2xl flex flex-col gap-4 overflow-hidden">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3 shrink-0 pr-10">
                    <div className="min-w-0 flex items-center gap-2.5">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                            <DialogTitle className="text-base font-bold truncate text-foreground">
                                {fileName}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground">
                                {isExcelOrCsv && currentSheet
                                    ? `${currentSheet.totalRows} ligne(s) · ${currentSheet.totalCols} colonne(s)`
                                    : isPdf
                                        ? "Document PDF"
                                        : isImage
                                            ? "Image"
                                            : "Aperçu de fichier"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                            <a href={downloadUrl}>
                                <Download className="w-3.5 h-3.5" />
                                Télécharger
                            </a>
                        </Button>
                    </div>
                </DialogHeader>

                {/* Corps de la modale en plein écran */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* CAS 1 : Chargement Excel */}
                    {isExcelOrCsv && loading && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                            <p className="text-xs text-muted-foreground font-medium">Chargement et analyse du tableur…</p>
                        </div>
                    )}

                    {/* Erreur de lecture */}
                    {error && (
                        <div className="flex-1 flex items-center justify-center text-sm text-rose-600 font-semibold">
                            {error}
                        </div>
                    )}

                    {/* CAS 2 : Affichage Tableur Excel / CSV */}
                    {isExcelOrCsv && !loading && !error && sheets && (
                        <div className="flex-1 flex flex-col min-h-0 space-y-3">
                            {/* Onglets et Recherche */}
                            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
                                    {sheets.map((s, idx) => (
                                        <button
                                            key={s.name}
                                            type="button"
                                            onClick={() => setActiveSheetIdx(idx)}
                                            className={cn(
                                                "px-3 py-1 rounded-lg text-xs font-semibold border transition-colors",
                                                activeSheetIdx === idx
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                    : "bg-background text-muted-foreground border-border hover:text-foreground",
                                            )}
                                        >
                                            {s.name} ({s.totalRows})
                                        </button>
                                    ))}
                                </div>

                                <div className="relative w-72">
                                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Filtrer dans la feuille..."
                                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Grille Tableur plein écran */}
                            <div className="flex-1 rounded-xl border border-border/60 overflow-auto bg-card shadow-inner">
                                <table className="w-full text-xs border-collapse">
                                    <tbody>
                                        {filteredRows.map((row, rIdx) => (
                                            <tr
                                                key={rIdx}
                                                className={cn(
                                                    "border-b border-border/40",
                                                    rIdx === 0
                                                        ? "bg-slate-900 dark:bg-slate-950 text-white font-bold sticky top-0 z-10 shadow-sm"
                                                        : "hover:bg-accent/40",
                                                )}
                                            >
                                                <td
                                                    className={cn(
                                                        "px-3 py-2 text-center font-mono text-[11px] border-r border-border/60 w-12 select-none",
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
                                                        className="px-3 py-2 border-r border-border/30 whitespace-nowrap max-w-[320px] truncate"
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
                        </div>
                    )}

                    {/* CAS 3 : Affichage PDF (iframe) */}
                    {isPdf && fileUrl && (
                        <div className="flex-1 w-full h-full rounded-xl overflow-hidden border border-border/60 bg-muted/20">
                            <iframe
                                src={fileUrl}
                                title={fileName}
                                className="w-full h-full border-none"
                            />
                        </div>
                    )}

                    {/* CAS 4 : Affichage Image */}
                    {isImage && fileUrl && (
                        <div className="flex-1 w-full h-full rounded-xl overflow-hidden border border-border/60 bg-slate-950/90 flex items-center justify-center p-4">
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}