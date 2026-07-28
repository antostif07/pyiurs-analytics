"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ScanLine,
    CheckCircle2,
    Package,
    Store,
    ArrowLeft,
    Loader2,
    TrendingDown,
    Search,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { recordBarcodeScanAction, validateAuditSessionAction } from "../audits-actions";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

    const [barcodeInput, setBarcodeInput] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [filterSearch, setFilterSearch] = useState("");

    const isReadOnly = audit.status === "validated";

    // Auto-focus pistolet laser
    useEffect(() => {
        if (!isReadOnly) {
            inputRef.current?.focus();
        }
    }, [isReadOnly]);

    // ✅ SCAN DU CODE-BARRES SUR LE SNAPSHOT FIGÉ EN BASE DE DONNÉES
    const handleScanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = barcodeInput.trim().toUpperCase();
        if (!cleanCode || isReadOnly || isScanning) return;

        setIsScanning(true);

        const result = await recordBarcodeScanAction(audit.id, cleanCode);

        setIsScanning(false);
        setBarcodeInput("");

        if (result.success) {
            toast.success(`Scanné avec succès : ${cleanCode}`);
            router.refresh();
        } else {
            toast.error(result.error || "Code-barres introuvable dans cet audit.");
        }

        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleValidateAudit = async () => {
        if (!confirm("Voulez-vous vraiment valider et clôturer cet audit ? L'inventaire sera gelé de façon permanente.")) return;

        setIsValidating(true);
        const result = await validateAuditSessionAction(audit.id);
        setIsValidating(false);

        if (result.success) {
            toast.success("Audit validé et clôturé avec succès !");
            router.refresh();
        } else {
            toast.error(result.error || "Échec de la validation.");
        }
    };

    // Calculs de synthèse basés sur le snapshot figé
    const scannedItemsCount = initialItems.filter(i => (i.counted_qty || 0) > 0).length;
    let totalDiffQty = 0;
    let totalDiffValue = 0;

    initialItems.forEach((item) => {
        const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
        totalDiffQty += diff;
        totalDiffValue += diff * (Number(item.unit_cost) || 0);
    });

    const filteredItems = initialItems.filter(item =>
        item.internal_barcode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        item.product_name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        (item.hs_code && item.hs_code.toLowerCase().includes(filterSearch.toLowerCase()))
    );

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">

            {/* 1. EN-TÊTE */}
            <div className="border-b border-border pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
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

                {!isReadOnly && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={isValidating || initialItems.length === 0}
                                className="h-10 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Clôturer & Valider l'Audit
                            </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className="bg-card text-card-foreground border-border rounded-2xl max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-base font-bold">
                                    Clôturer & Valider l'Audit {audit.reference} ?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-muted-foreground font-light leading-relaxed">
                                    Une fois validé, cet inventaire physique sera gelé de façon permanente dans Supabase. Les comptages et la démarque finale calculée ne pourront plus être modifiés.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter className="gap-2 pt-2">
                                <AlertDialogCancel className="h-9 rounded-xl text-xs cursor-pointer">
                                    Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleValidateAudit}
                                    disabled={isValidating}
                                    className="h-9 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                >
                                    {isValidating ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                            Validation en cours...
                                        </>
                                    ) : (
                                        "Valider et Clôturer"
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            {/* 2. CHAMP DE SCAN (PISTOLET LASER) */}
            {!isReadOnly && (
                <div className="bg-card text-card-foreground border-2 border-primary/30 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <ScanLine className="w-4 h-4 text-primary animate-pulse" />
                            Scan Pistolet Laser (Stock Figé à l'ouverture)
                        </label>
                        <span className="text-[10px] text-emerald-600 font-bold">
                            Snapshot Actif ({initialItems.length} Réf. Congelées) ✓
                        </span>
                    </div>

                    <form onSubmit={handleScanSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                type="text"
                                placeholder="Scannez le code-barres unitaire..."
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                disabled={isScanning}
                                className="h-11 rounded-xl bg-muted/20 border-input font-mono text-sm text-foreground focus:ring-2 focus:ring-primary pl-4 font-bold"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isScanning || !barcodeInput.trim()}
                            className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer"
                        >
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scanner"}
                        </Button>
                    </form>
                </div>
            )}

            {/* 3. SYNTHÈSE DE LA DÉMARQUE SUR LE SNAPSHOT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Package className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Articles Scannés / Total
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            {scannedItemsCount} / {initialItems.length}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted text-foreground">
                        <ScanLine className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Écart Quantité Phys.
                        </span>
                        <div className={cn(
                            "text-lg font-bold font-mono",
                            totalDiffQty < 0 ? "text-rose-600" : totalDiffQty > 0 ? "text-emerald-600" : "text-foreground"
                        )}>
                            {totalDiffQty > 0 ? `+${totalDiffQty}` : totalDiffQty}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-xl",
                        totalDiffValue < 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                    )}>
                        <TrendingDown className="w-5 h-5 stroke-[1.75]" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Démarque Finale ($ USD)
                        </span>
                        <div className={cn(
                            "text-lg font-bold font-mono",
                            totalDiffValue < 0 ? "text-rose-600" : totalDiffValue > 0 ? "text-emerald-600" : "text-foreground"
                        )}>
                            {formatUSD(totalDiffValue)}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. TABLEAU SHADCN UI DES ARTICLES SCANNÉS VS STOCK FIGÉ */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Inventaire des Articles ({filteredItems.length})
                    </h2>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
                        <input
                            type="text"
                            placeholder="Filtrer par code-barres, nom..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
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
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Stock Figé Odoo</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Compté Physique</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Écart</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Coût Unitaire</TableHead>
                                <TableHead className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider text-right">Démarque ($)</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-border/40 font-mono">
                            {filteredItems.map((item) => {
                                const isScanned = (item.counted_qty || 0) > 0;
                                const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
                                const impact = diff * (Number(item.unit_cost) || 0);

                                return (
                                    <TableRow
                                        key={item.id}
                                        className={cn(
                                            "transition-colors",
                                            isScanned ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "hover:bg-muted/30"
                                        )}
                                    >
                                        <TableCell className="py-2.5 px-4 font-mono font-bold text-primary text-xs">
                                            {item.internal_barcode}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 font-sans font-semibold text-foreground">
                                            {item.product_name}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-right text-muted-foreground font-bold">
                                            {item.theoretical_qty}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-right font-bold text-foreground">
                                            <span className={cn(isScanned ? "text-emerald-600" : "text-muted-foreground/40")}>
                                                {item.counted_qty}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-right">
                                            <span className={cn(
                                                "font-bold text-xs",
                                                diff < 0 ? "text-rose-600" : diff > 0 ? "text-emerald-600" : "text-muted-foreground/60"
                                            )}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-right text-muted-foreground">
                                            {formatUSD(Number(item.unit_cost) || 0)}
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4 text-right font-bold">
                                            <span className={cn(
                                                diff < 0 ? "text-rose-600" : diff > 0 ? "text-emerald-600" : "text-muted-foreground/60"
                                            )}>
                                                {formatUSD(impact)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

        </div>
    );
}