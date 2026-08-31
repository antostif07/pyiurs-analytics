'use client';

import React, { useState, useEffect } from "react";
import {
    getUnscannedItemsDiagnosticAction,
    forceMarkItemAsFoundAction,
    applyOdooZeroStockAdjustmentAction,
    ReconcileItemDiagnostic
} from "@/app/inventory/audits/_lib/reconcile-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    CheckCircle2,
    AlertTriangle,
    Truck,
    Search,
    RefreshCw,
    ArrowLeft,
    ShieldAlert,
    Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AuditReconciliationPage({ params }: { params: { id: string } }) {
    const auditId = params.id;

    const [diagnostics, setDiagnostics] = useState<ReconcileItemDiagnostic[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filterSearch, setFilterSearch] = useState("");
    const [isSyncingOdoo, setIsSyncingOdoo] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await getUnscannedItemsDiagnosticAction(auditId);
        if (res.success && res.data) {
            setDiagnostics(res.data);
        } else {
            toast.error(res.error || "Impossible de charger le diagnostic Odoo.");
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [auditId]);

    // Action : Marquer un article retrouvant sa pièce physique sans code-barres
    const handleMarkAsFound = async (item: ReconcileItemDiagnostic) => {
        setProcessingId(item.id);
        const res = await forceMarkItemAsFoundAction(auditId, item.id, "Article physique identifié en rayon");

        if (res.success) {
            toast.success(`Article '${item.product_name}' déclaré scanné (+1) !`);
            setDiagnostics((prev) => prev.filter((d) => d.id !== item.id));
        } else {
            toast.error(res.error || "Erreur de mise à jour.");
        }
        setProcessingId(null);
    };

    // Action : Clôture & Ajustement direct Odoo à 0
    const handleApplyOdooSync = async () => {
        setIsSyncingOdoo(true);
        toast.info("Ajustement des stocks en cours dans Odoo...");
        const res = await applyOdooZeroStockAdjustmentAction(auditId);

        if (res.success) {
            toast.success(res.message, { duration: 6000 });
            loadData();
        } else {
            toast.error(res.error || "Échec de l'ajustement Odoo.");
        }
        setIsSyncingOdoo(false);
    };

    const filteredDiagnostics = diagnostics.filter((d) =>
        d.product_name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        d.internal_barcode.toLowerCase().includes(filterSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-5">
                <div>
                    <Link
                        href={`/inventory/audits/${auditId}`}
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase tracking-wider mb-2"
                    >
                        <ArrowLeft size={12} /> Retour au scanner d'audit
                    </Link>
                    <h1 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-amber-500" />
                        Réconciliation des Non Scannés & Traitement des Écarts
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Analyse croisée multi-emplacements Odoo pour identifier les pièces sans étiquette ou transférées.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={loadData} variant="outline" size="sm" className="h-9 gap-1.5">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Actualiser
                    </Button>

                    <Button
                        onClick={handleApplyOdooSync}
                        disabled={isSyncingOdoo || diagnostics.length === 0}
                        className="h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                        <Zap className="w-4 h-4" />
                        Ajuster Odoo à 0 ({diagnostics.length} articles)
                    </Button>
                </div>
            </div>

            {/* BARRE DE RECHERCHE */}
            <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Rechercher par nom ou code-barres..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full bg-card border border-input rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            {/* TABLEAU MULTI-EMPLACEMENTS ODOO */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <Table className="w-full text-xs">
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="uppercase text-[9px] font-bold">Article / Code-barres</TableHead>
                            <TableHead className="uppercase text-[9px] font-bold">Théorique Boutique</TableHead>
                            <TableHead className="uppercase text-[9px] font-bold">Autres Emplacements Odoo</TableHead>
                            <TableHead className="uppercase text-[9px] font-bold">Diagnostic Odoo</TableHead>
                            <TableHead className="uppercase text-[9px] font-bold text-right">Action Réconciliation</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40 font-mono">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-sans">
                                    Analyse croisée des emplacements Odoo en cours...
                                </TableCell>
                            </TableRow>
                        ) : filteredDiagnostics.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-emerald-600 font-sans font-semibold">
                                    🎉 Tous les articles non scannés ont été réconciliés ou traités !
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDiagnostics.map((item) => (
                                <TableRow key={item.id} className="hover:bg-muted/30">
                                    <TableCell className="py-3 px-4 font-sans font-semibold">
                                        <div>{item.product_name}</div>
                                        <div className="font-mono text-[11px] text-primary">{item.internal_barcode}</div>
                                    </TableCell>

                                    <TableCell className="py-3 px-4 text-center font-bold text-muted-foreground">
                                        {item.current_store_qty}
                                    </TableCell>

                                    <TableCell className="py-3 px-4 font-sans text-xs">
                                        {item.other_locations_stock.length === 0 ? (
                                            <span className="text-muted-foreground/60">Aucun autre stock</span>
                                        ) : (
                                            item.other_locations_stock.map((l, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                                    <span className="font-bold">{l.location_name} :</span>
                                                    <span className={cn("font-mono font-bold", l.quantity < 0 ? "text-rose-600" : "text-emerald-600")}>
                                                        {l.quantity}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </TableCell>

                                    <TableCell className="py-3 px-4 font-sans">
                                        {item.diagnostic_tag === "SOLD_IN_OTHER_STORE" ? (
                                            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px] font-bold">
                                                <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Vendu ailleurs (-1)
                                            </Badge>
                                        ) : item.diagnostic_tag === "POSSIBLE_TRANSFER_ERROR" ? (
                                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-bold">
                                                <Truck className="w-2.5 h-2.5 mr-1" /> En Transit / Autre Dépôt
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[9px] text-slate-500">
                                                Pertes confirmée (À mettre à 0)
                                            </Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="py-3 px-4 text-right">
                                        <Button
                                            onClick={() => handleMarkAsFound(item)}
                                            disabled={processingId === item.id}
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-[10px] font-bold gap-1 border-emerald-600/40 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Retrouvé sans étiquette (+1)
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}