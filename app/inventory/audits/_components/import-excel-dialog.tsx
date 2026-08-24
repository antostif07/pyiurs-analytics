"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    FileSpreadsheet,
    Loader2,
    Upload,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    FileCode,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { importExcelBarcodesAction } from "../_lib/audits-actions";

interface ImportExcelDialogProps {
    auditId: string;
}

export function ImportExcelDialog({ auditId }: ImportExcelDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fichier et parsing
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [selectedBarcodeCol, setSelectedBarcodeCol] = useState<string>("");

    // Étape du Wizard (1: Chargement fichier, 2: Sélection colonne & Aperçu)
    const [step, setStep] = useState<1 | 2>(1);

    const resetState = () => {
        setFile(null);
        setHeaders([]);
        setRawRows([]);
        setSelectedBarcodeCol("");
        setStep(1);
        setLoading(false);
    };

    // 1. LECTURE DU FICHIER EXCEL OU CSV (.xlsx, .xls, .csv, .txt)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setLoading(true);
        setFile(selectedFile);

        try {
            const buffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });

            // Prendre la première feuille de calcul
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convertir en tableau d'objets JSON
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
                defval: "",
            });

            if (jsonData.length === 0) {
                toast.error("Le fichier sélectionné est vide.");
                resetState();
                return;
            }

            // Extraire les noms de colonnes (Entêtes)
            const extractedHeaders = Object.keys(jsonData[0] || {});
            setHeaders(extractedHeaders);
            setRawRows(jsonData);

            // Auto-détection de la colonne code-barres
            const autoCol = extractedHeaders.find((h) => {
                const lower = h.toLowerCase();
                return (
                    lower.includes("code") ||
                    lower.includes("barcode") ||
                    lower.includes("cb") ||
                    lower.includes("ref") ||
                    lower.includes("sku")
                );
            });

            setSelectedBarcodeCol(autoCol || extractedHeaders[0] || "");
            setStep(2); // Passer à l'étape de confirmation et choix de colonne
        } catch (err) {
            console.error("Erreur lecture Excel:", err);
            toast.error("Impossible de lire ce fichier Excel/CSV.");
            resetState();
        } finally {
            setLoading(false);
        }
    };

    // 2. EXÉCUTION DE L'IMPORTATION
    const handleConfirmImport = async () => {
        if (!selectedBarcodeCol) {
            toast.error("Veuillez sélectionner la colonne contenant les codes-barres.");
            return;
        }

        setLoading(true);

        try {
            // Extraire et nettoyer la liste des codes-barres de la colonne choisie
            const extractedBarcodes: string[] = rawRows
                .map((row) => String(row[selectedBarcodeCol] || "").trim().toUpperCase())
                .filter((code) => code.length > 0);

            if (extractedBarcodes.length === 0) {
                toast.error("Aucun code-barres valide n'a été trouvé dans cette colonne.");
                setLoading(false);
                return;
            }

            // Appel de l'action Server
            const res = await importExcelBarcodesAction(auditId, extractedBarcodes);

            if (res.success) {
                toast.success(`${res.newlyScannedCount} articles scannés (1/1) avec succès !`);
                if (res.unknownCount && res.unknownCount > 0) {
                    toast.warning(`${res.unknownCount} codes-barres du fichier sont hors périmètre Odoo.`);
                }
                setOpen(false);
                resetState();
            } else {
                toast.error(res.error || "Échec de l'importation.");
            }
        } catch (err) {
            toast.error("Erreur lors du traitement de l'importation.");
        } finally {
            setLoading(false);
        }
    };

    // Échantillon de prévisualisation des 5 premières lignes
    const previewRows = rawRows.slice(0, 5);

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-2 cursor-pointer border-border hover:bg-accent shadow-xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Import Excel / CSV</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border rounded-2xl shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        Importer un Inventaire Excel / CSV
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-light">
                        Chargez un fichier `.xlsx`, `.xls` ou `.csv` pour valider les articles scannés unitaires (1/1).
                    </DialogDescription>
                </DialogHeader>

                {/* ÉTAPE 1 : SÉLECTION / DROP DU FICHIER */}
                {step === 1 && (
                    <div className="space-y-4 pt-2">
                        <div className="border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer bg-muted/10 transition-colors relative">
                            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.tsv,.txt"
                                onChange={handleFileChange}
                                disabled={loading}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                id="excel-file-input"
                            />
                            <label htmlFor="excel-file-input" className="cursor-pointer">
                                <span className="text-xs font-semibold text-primary block">
                                    {loading ? "Lecture du fichier en cours..." : "Cliquez ou glissez votre fichier Excel (.xlsx, .csv)"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-light block mt-1">
                                    Formats pris en compte : Microsoft Excel (.xlsx, .xls) et CSV
                                </span>
                            </label>
                        </div>
                        {loading && (
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span>Analyse de la feuille de calcul...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ÉTAPE 2 : CHOIX DE LA COLONNE & PRÉVISUALISATION */}
                {step === 2 && (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                        {/* Infos fichier */}
                        <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                            <div className="flex items-center gap-2 truncate">
                                <FileCode className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-xs font-semibold truncate">{file?.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={resetState} className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                                <RefreshCw className="w-3 h-3 mr-1" /> Changer
                            </Button>
                        </div>

                        {/* Sélection de la colonne Code-barres */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold flex items-center gap-1">
                                Colonne du Code-barres Unitaire <span className="text-rose-500">*</span>
                            </Label>
                            <select
                                value={selectedBarcodeCol}
                                onChange={(e) => setSelectedBarcodeCol(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-input bg-card text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono font-medium cursor-pointer"
                            >
                                {headers.map((h) => (
                                    <option key={h} value={h}>
                                        Colonne : "{h}"
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-muted-foreground font-light">
                                {rawRows.length} lignes détectées dans le fichier Excel.
                            </p>
                        </div>

                        {/* Aperçu des 5 premières lignes */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                Aperçu des Données (5 premières lignes)
                            </Label>
                            <div className="bg-muted/30 border border-border rounded-xl overflow-hidden text-[11px] font-mono">
                                <table className="w-full text-left">
                                    <thead className="bg-muted/60 border-b border-border text-[9px] uppercase font-bold text-muted-foreground">
                                        <tr>
                                            <th className="py-2 px-3">Ligne</th>
                                            <th className="py-2 px-3 text-primary">Code-barres Extrait</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {previewRows.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="py-1.5 px-3 text-muted-foreground">{idx + 1}</td>
                                                <td className="py-1.5 px-3 font-bold text-foreground">
                                                    {String(row[selectedBarcodeCol] || "—")}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                            <Button type="button" variant="outline" onClick={resetState} className="h-9 text-xs rounded-xl cursor-pointer">
                                Annuler
                            </Button>

                            <Button
                                type="button"
                                onClick={handleConfirmImport}
                                disabled={loading || !selectedBarcodeCol}
                                className="h-9 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Importation...
                                    </>
                                ) : (
                                    <>
                                        <span>Valider L'import ({rawRows.length})</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}