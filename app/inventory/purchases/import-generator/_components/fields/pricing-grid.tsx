// app/inventory/purchases/import-generator/_components/fields/pricing-grid.tsx
"use client";

import type { ProductFormState } from "../../import-types";
import type { Departement } from "../global-params-section";

interface Props {
    form: ProductFormState;
    departement: Departement;
    currentCodeRemise: string;
    onFieldChange: (field: keyof ProductFormState, value: string | number) => void;
}

export default function PricingGrid({
    form,
    departement,
    currentCodeRemise,
    onFieldChange,
}: Props) {
    return (
        <div className="space-y-3 pt-3 border-t border-border/60">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                3. Tarification
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        PU
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.pu}
                        onChange={(e) => onFieldChange("pu", Number(e.target.value))}
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] font-mono outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        CAA
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.caa}
                        onChange={(e) => onFieldChange("caa", Number(e.target.value))}
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] font-mono outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Prix vente
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.prix}
                        onChange={(e) =>
                            onFieldChange("prix", Number(e.target.value))
                        }
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] font-mono font-bold text-primary outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Code remise
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={currentCodeRemise}
                        placeholder="PO + Date requis"
                        className="w-full h-9 bg-muted/40 border border-border rounded-lg px-2 text-[11px] font-mono font-bold text-primary cursor-not-allowed opacity-90"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Code fourn.
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={departement === "Femme" ? form.marque : ""}
                        className="w-full h-9 bg-muted/40 border border-border rounded-lg px-2 text-[11px] font-mono cursor-not-allowed opacity-80"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        HS +
                    </label>
                    <input
                        type="text"
                        value={form.hsPlus}
                        onChange={(e) => onFieldChange("hsPlus", e.target.value)}
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] outline-none"
                    />
                </div>
            </div>
        </div>
    );
}