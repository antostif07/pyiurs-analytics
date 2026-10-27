// app/inventory/purchases/import-generator/_components/global-params-section.tsx
"use client";

import { Lock } from "lucide-react";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import type { OdooOption } from "../../import-actions";
import { OdooPurchaseOrderOption } from "../../_lib/_components/purchase-order-selector";

// ─── Types ──────────────────────────────────────────────────

export type Departement = "Beauty" | "Femme" | "Enfant";

export interface LogPurchaseOrderOption extends OdooOption {
    partner_id?: [number, string];
}

/**
 * Dérive le département à partir du nom du fournisseur du PO.
 * P.FEM → Femme · P.KID → Enfant · P.BTY → Beauty
 * Fallback : "Beauty" (ne devrait pas arriver si le filtre PO est correct).
 */
export function deriveDepartement(
    po: OdooPurchaseOrderOption | null,
): Departement {
    if (!po) return "Beauty";
    const upper = (po.supplierName || "").toUpperCase();
    if (upper.includes("P.FEM")) return "Femme";
    if (upper.includes("P.KID")) return "Enfant";
    if (upper.includes("P.BTY")) return "Beauty";
    return "Beauty";
}

// ─── Props ──────────────────────────────────────────────────

interface Props {
    logPurchaseOrders: LogPurchaseOrderOption[];
    polog: string;
    onPologChange: (value: string) => void;
    dateChargement: string;
    onDateChargementChange: (value: string) => void;
    departement: Departement; // déjà dérivé par le parent
}

// ─── Composant ──────────────────────────────────────────────

export default function GlobalParamsSection({
    logPurchaseOrders,
    polog,
    onPologChange,
    dateChargement,
    onDateChargementChange,
    departement,
}: Props) {
    return (
        <ReportSection index={2} title="Paramètres globaux">
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* POLOG */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                            POLOG
                        </label>
                        <select
                            value={polog}
                            onChange={(e) => onPologChange(e.target.value)}
                            className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                        >
                            <option value="">Sélectionner un PO LOG...</option>
                            {logPurchaseOrders.map((po) => (
                                <option key={po.id} value={po.name}>
                                    {po.name}
                                    {po.partner_id ? ` (${po.partner_id[1]})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date de chargement */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                            Date de chargement
                        </label>
                        <input
                            type="date"
                            value={dateChargement}
                            onChange={(e) => onDateChargementChange(e.target.value)}
                            className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                        />
                    </div>

                    {/* Département — dérivé du PO, read-only */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                            Département
                        </label>
                        <div
                            className="w-full h-9 bg-muted/40 border border-border rounded-lg px-2 text-[11px] font-semibold text-foreground flex items-center justify-between cursor-not-allowed"
                            title="Déterminé automatiquement par le fournisseur du PO"
                        >
                            <span>{departement}</span>
                            <Lock className="w-3 h-3 text-muted-foreground/60" />
                        </div>
                    </div>
                </div>

                {/* Hint contextuel */}
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                    Le département est verrouillé automatiquement par le
                    fournisseur du PO sélectionné.
                </p>
            </div>
        </ReportSection>
    );
}