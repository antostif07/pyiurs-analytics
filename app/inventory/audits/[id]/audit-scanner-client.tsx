"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, CheckCircle2, Package, Store, ArrowLeft, Loader2, TrendingDown, Search, Volume2, VolumeX, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, AlertTriangle, } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { playScanSound } from "../_lib/utils/sound-effects";
import { importExcelBarcodesAction, recordBarcodeScanAction, validateAuditSessionAction } from "../_lib/audits-actions";

interface AuditScannerClientProps {
    audit: any;
    initialItems: any[];
}

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function AuditScannerClient({ audit, initialItems }: AuditScannerClientProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // État local réactif des articles
    const [items, setItems] = useState<any[]>(initialItems);
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const [barcodeInput, setBarcodeInput] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Filtres et Pagination
    const [filterSearch, setFilterSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "scanned" | "remaining">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const isReadOnly = audit.status === "validated";

    useEffect(() => {
        if (!isReadOnly) {
            inputRef.current?.focus();
        }
    }, [isReadOnly]);

    // SCAN UNITAIRE ULTRA-RAPIDE
    const handleScanSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        const cleanCode = barcodeInput.trim().toUpperCase();
        if (!cleanCode || isReadOnly || isScanning) return;

        setIsScanning(true);

        const result = await recordBarcodeScanAction(audit.id, cleanCode);

        setIsScanning(false);
        setBarcodeInput("");

        if (result.success && result.item) {
            if (soundEnabled) playScanSound("success");

            if (result.isUnexpected) {
                toast.warning(result.message || `Produit inattendu ajouté : ${cleanCode}`, {
                    duration: 5000,
                });
            } else {
                toast.success(`Scanné (1/1) : ${cleanCode}`);
            }

            setItems((prevItems) => {
                const exists = prevItems.some((i) => i.internal_barcode.toUpperCase() === cleanCode);
                if (exists) {
                    return prevItems.map((item) =>
                        item.internal_barcode.toUpperCase() === cleanCode
                            ? { ...item, counted_qty: 1, scanned_at: new Date().toISOString() }
                            : item
                    );
                } else {
                    return [result.item, ...prevItems];
                }
            });

        } else if (result.isDuplicate) {
            if (soundEnabled) playScanSound("error");
            toast.warning(result.error);
        } else {
            if (soundEnabled) playScanSound("error");
            toast.error(result.error);
        }

        setTimeout(() => inputRef.current?.focus(), 50);
    };

    // IMPORTATION EXCEL COMPATIBLE VRAIS FICHIERS (.XLSX / .XLS / .CSV)
    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            toast.info("Analyse du fichier Excel en cours...");

            const XLSX = await import("xlsx");
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const barcodes: string[] = [];

            rows.forEach((row: any) => {
                if (!Array.isArray(row) || row.length === 0) return;

                for (const cell of row) {
                    if (cell !== undefined && cell !== null) {
                        const strVal = String(cell).trim();
                        const lower = strVal.toLowerCase();

                        if (
                            strVal.length > 0 &&
                            !lower.includes("code") &&
                            !lower.includes("barcode") &&
                            !lower.includes("ean") &&
                            !lower.includes("produit")
                        ) {
                            barcodes.push(strVal);
                            break;
                        }
                    }
                }
            });

            if (barcodes.length === 0) {
                toast.error("Aucun code-barres valide trouvé dans le fichier.");
                return;
            }

            toast.info(`Traitement de ${barcodes.length} codes-barres extraits...`);
            const res = await importExcelBarcodesAction(audit.id, barcodes);

            if (res.success) {
                // ✅ Déstructuration type-safe avec valeurs par défaut (0)
                const newlyScanned = res.newlyScannedCount ?? 0;
                const alreadyScanned = res.alreadyScannedCount ?? 0;
                const unexpected = res.unexpectedCount ?? 0;
                const unknown = res.unknownCount ?? 0;

                let successMsg = `Importation réussie : +${newlyScanned} nouveaux articles scannés.`;

                if (alreadyScanned > 0) {
                    successMsg += ` (${alreadyScanned} étaient déjà vérifiés).`;
                }

                if (unexpected > 0) {
                    successMsg += ` +${unexpected} articles hors périmètre Odoo ajoutés (+1).`;
                }

                toast.success(successMsg, { duration: 7000 });

                if (unknown > 0) {
                    toast.warning(`${unknown} codes-barres inconnus dans tout Odoo ont été ignorés.`, { duration: 7000 });
                }

                router.refresh();
            } else {
                toast.error(res.error || "Échec de l'importation.");
            }
        } catch (err) {
            console.error("[EXCEL_READ_ERROR]", err);
            toast.error("Erreur lors de la lecture du fichier Excel.");
        } finally {
            setIsImporting(false);
            e.target.value = "";
        }
    };

    // EXPORTATION EXCEL
    const handleExportExcel = () => {
        const headers = ["Code-barres", "Produit", "Emplacement Odoo", "Stock Théorique Odoo", "Compté Physique", "Écart Qté", "Coût Unitaire ($)", "Démarque ($)"];
        const rows = items.map((i) => [
            i.internal_barcode,
            `"${i.product_name.replace(/"/g, '""')}"`,
            `"${(i.supplier_ref || "Stock").replace(/"/g, '""')}"`,
            i.theoretical_qty,
            i.counted_qty,
            i.counted_qty - i.theoretical_qty,
            i.unit_cost,
            (i.counted_qty - i.theoretical_qty) * i.unit_cost,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AUDIT_${audit.reference}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        window.print();
    };

    // COMPTEURS EN TEMPS RÉEL
    const totalItemsCount = items.length;
    const scannedItemsCount = items.filter((i) => (i.counted_qty || 0) === 1).length;
    const remainingItemsCount = totalItemsCount - scannedItemsCount;
    const progressPercent = totalItemsCount > 0 ? Math.round((scannedItemsCount / totalItemsCount) * 100) : 0;

    let totalDiffQty = 0;
    let totalDiffValue = 0;
    items.forEach((item) => {
        const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
        totalDiffQty += diff;
        totalDiffValue += diff * (Number(item.unit_cost) || 0);
    });

    // FILTRAGE
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchText =
                item.internal_barcode.toLowerCase().includes(filterSearch.toLowerCase()) ||
                item.product_name.toLowerCase().includes(filterSearch.toLowerCase());

            const isScanned = (item.counted_qty || 0) === 1;
            if (statusFilter === "scanned") return matchText && isScanned;
            if (statusFilter === "remaining") return matchText && !isScanned;
            return matchText;
        });
    }, [items, filterSearch, statusFilter]);

    // PAGINATION
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage]);

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300 print:p-0">

            {/* 1. EN-TÊTE DE LA SESSION */}
            <div className="border-b border-border pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
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
                        <Badge className={cn(
                            "text-[9px] font-bold font-mono",
                            isReadOnly ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        )}>
                            {isReadOnly ? "Validé" : "En Cours"}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-light mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Store className="w-3.5 h-3.5 text-primary" /> {audit.shop_name}
                        </span>
                        <span>•</span>
                        <span>Périmètre : <strong>{audit.department}</strong></span>
                    </p>
                </div>

                {/* BOUTONS D'EXPORT & VALIDATION */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleExportExcel} variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Export Excel</span>
                    </Button>

                    <Button onClick={handleExportPDF} variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer">
                        <FileText className="w-4 h-4 text-rose-600" />
                        <span>Rapport PDF</span>
                    </Button>

                    {!isReadOnly && (
                        <>
                            {/* Bouton Import Fichier Excel (.xlsx, .xls, .csv) */}
                            <label className="h-9 px-3 rounded-xl text-xs font-semibold bg-muted/30 hover:bg-muted/60 border border-border text-foreground flex items-center gap-1.5 cursor-pointer transition-colors">
                                {isImporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : (
                                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                                )}
                                <span>{isImporting ? "Importation..." : "Import Excel"}</span>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv,.txt"
                                    onChange={handleExcelImport}
                                    disabled={isImporting}
                                    className="hidden"
                                />
                            </label>

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
                                            Clôturer l'Audit {audit.reference} ?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs text-muted-foreground font-light">
                                            L'inventaire unitaire sera gelé de façon permanente. Les comptages ne pourront plus être modifiés.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2 pt-2">
                                        <AlertDialogCancel className="h-9 rounded-xl text-xs cursor-pointer">
                                            Annuler
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={async () => {
                                                setIsValidating(true);
                                                try {
                                                    const res = await validateAuditSessionAction(audit.id);
                                                    if (res.success) {
                                                        toast.success("Audit clôturé et verrouillé avec succès !");
                                                        router.refresh();
                                                    } else {
                                                        toast.error(res.error || "Échec de la clôture.");
                                                    }
                                                } catch (err) {
                                                    toast.error("Erreur réseau lors de la clôture.");
                                                } finally {
                                                    setIsValidating(false);
                                                }
                                            }}
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
            </div>

            {/* 2. ZONE DU PISTOLET LASER */}
            {!isReadOnly && (
                <div className="bg-card border-2 border-primary/30 rounded-2xl p-4 shadow-sm space-y-2 print:hidden">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <ScanLine className="w-4 h-4 text-primary animate-pulse" /> Scan Pistolet Laser (Unitaire Strict)
                        </label>
                        <button type="button" onClick={() => setSoundEnabled(!soundEnabled)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="text-[10px]">{soundEnabled ? "Bip On" : "Bip Off"}</span>
                        </button>
                    </div>

                    <form onSubmit={handleScanSubmit} className="flex gap-2">
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Scannez le code-barres unitaire..."
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            disabled={isScanning}
                            className="h-11 rounded-xl bg-muted/20 border-input font-mono text-sm text-foreground focus:ring-2 focus:ring-primary pl-4 font-bold"
                        />
                        <Button type="submit" disabled={isScanning || !barcodeInput.trim()} className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer">
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Flash (1/1)"}
                        </Button>
                    </form>
                </div>
            )}

            {/* 3. COMPTEURS ET PROGRESSION */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scannés avec Succès</span>
                        <div className="text-lg font-bold font-mono text-emerald-600">{scannedItemsCount} / {totalItemsCount}</div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                        <Package className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Reste à Scanner</span>
                        <div className="text-lg font-bold font-mono text-amber-600">{remainingItemsCount}</div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted text-foreground">
                        <ScanLine className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Écart Quantité</span>
                        <div className={cn("text-lg font-bold font-mono", totalDiffQty < 0 ? "text-rose-600" : "text-foreground")}>
                            {totalDiffQty}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl", totalDiffValue < 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600")}>
                        <TrendingDown className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Démarque ($)</span>
                        <div className={cn("text-lg font-bold font-mono", totalDiffValue < 0 ? "text-rose-600" : "text-emerald-600")}>
                            {formatUSD(totalDiffValue)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full bg-muted/30 h-2 rounded-full overflow-hidden border border-border/40">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* 4. TABLEAU PAGINÉ DES ARTICLES */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2 print:hidden">
                    <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
                            className={cn("px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer", statusFilter === "all" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            Tous ({totalItemsCount})
                        </button>
                        <button
                            onClick={() => { setStatusFilter("scanned"); setCurrentPage(1); }}
                            className={cn("px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer", statusFilter === "scanned" ? "bg-card shadow-xs text-emerald-600" : "text-muted-foreground hover:text-foreground")}
                        >
                            Scannés ({scannedItemsCount})
                        </button>
                        <button
                            onClick={() => { setStatusFilter("remaining"); setCurrentPage(1); }}
                            className={cn("px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer", statusFilter === "remaining" ? "bg-card shadow-xs text-amber-600" : "text-muted-foreground hover:text-foreground")}
                        >
                            Reste ({remainingItemsCount})
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
                        <input
                            type="text"
                            placeholder="Filtrer par code-barres ou nom..."
                            value={filterSearch}
                            onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-muted/20 border border-input rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                    <Table className="w-full text-xs">
                        <TableHeader className="bg-muted/40">
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Code-barres Unitaire</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Produit Odoo</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">Emplacement Odoo</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-center">Théorique</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-center">Statut Scan</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Impact ($)</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-border/40 font-mono">
                            {paginatedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-sans text-xs">
                                        Aucun article ne correspond à vos filtres.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map((item) => {
                                    const isScanned = (item.counted_qty || 0) === 1;
                                    const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
                                    const impact = diff * (Number(item.unit_cost) || 0);

                                    return (
                                        <TableRow key={item.id} className={cn("transition-colors", isScanned ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "hover:bg-muted/30")}>
                                            <TableCell className="py-2.5 px-4 font-mono font-bold text-primary text-xs">
                                                {item.internal_barcode}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 font-sans font-semibold text-foreground">
                                                {item.product_name}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 font-sans text-muted-foreground font-medium text-[11px]">
                                                {item.supplier_ref || "Stock Principal"}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 text-center text-muted-foreground font-bold">
                                                {item.theoretical_qty}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 text-center font-sans">
                                                {item.theoretical_qty === 0 && (item.counted_qty || 0) === 1 ? (
                                                    <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-bold">
                                                        <AlertTriangle className="w-2.5 h-2.5 mr-1 text-purple-600" /> Hors Périmètre (+1)
                                                    </Badge>
                                                ) : isScanned ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                                                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Scanné (1/1)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 font-medium">
                                                        En Attente (0/1)
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 text-right font-bold">
                                                <span className={cn(diff < 0 ? "text-rose-600" : "text-muted-foreground/60")}>
                                                    {formatUSD(impact)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between pt-2 print:hidden">
                    <span className="text-xs text-muted-foreground font-light">
                        Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong> ({filteredItems.length} résultats)
                    </span>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="h-8 px-2.5 text-xs rounded-xl cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Précédent
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="h-8 px-2.5 text-xs rounded-xl cursor-pointer"
                        >
                            Suivant <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>

        </div>
    );
}