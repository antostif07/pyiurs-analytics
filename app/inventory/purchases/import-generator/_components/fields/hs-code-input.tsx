// app/inventory/purchases/import-generator/_components/fields/hs-code-input.tsx
"use client";

import type { ProductFormState } from "../../import-types";

interface Props {
    codeHs: string;
    nom: string;
    quantity: number;
    autoFilling: boolean;
    autoFillSuccess: boolean | null;
    onFieldChange: (field: keyof ProductFormState, value: string | number) => void;
    onHsCodeBlur: (
        e?: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>,
    ) => void;
}

export default function HsCodeInput({
    codeHs,
    nom,
    quantity,
    autoFilling,
    autoFillSuccess,
    onFieldChange,
    onHsCodeBlur,
}: Props) {
    return (
        <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                1. Code HS & Quantité
            </h3>

            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        Code HS / Douanier
                    </label>
                    {autoFilling && (
                        <span className="text-[9px] font-bold uppercase text-primary animate-pulse">
                            Recherche Odoo...
                        </span>
                    )}
                    {autoFillSuccess === true && (
                        <span className="text-[9px] font-bold uppercase text-emerald-600">
                            Prérempli Odoo ✓
                        </span>
                    )}
                    {autoFillSuccess === false && (
                        <span className="text-[9px] font-medium uppercase text-muted-foreground">
                            Nouveau produit
                        </span>
                    )}
                </div>
                <input
                    type="text"
                    required
                    placeholder="Ex: 3304.99.00"
                    value={codeHs}
                    onChange={(e) => onFieldChange("codeHs", e.target.value)}
                    onBlur={onHsCodeBlur}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onHsCodeBlur(e);
                        }
                    }}
                    className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2.5 text-[11px] font-mono outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Nom du produit
                    </label>
                    <input
                        type="text"
                        required
                        value={nom}
                        onChange={(e) => onFieldChange("nom", e.target.value)}
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Quantité
                    </label>
                    <input
                        type="number"
                        required
                        min={1}
                        value={quantity}
                        onChange={(e) =>
                            onFieldChange("quantity", Number(e.target.value))
                        }
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] font-mono font-bold outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
            </div>
        </div>
    );
}