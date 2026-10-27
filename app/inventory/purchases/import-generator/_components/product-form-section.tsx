// app/inventory/purchases/import-generator/_components/product-form-section.tsx
"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";

import { ReportSection } from "@/components/new-ui/layout/report-section";
import { Button } from "@/components/ui/button";

import HsCodeInput from "./fields/hs-code-input";
import CharacteristicsGrid from "./fields/characteristics-grid";
import PricingGrid from "./fields/pricing-grid";

import { useHsCodeLookup } from "../_lib/hooks/use-hs-code-lookup";
import type { OdooOption } from "../../import-actions";
import type { ProductFormState } from "../import-types";
import type { Departement } from "./global-params-section";

interface Props {
    form: ProductFormState;
    departement: Departement;
    currentCodeRemise: string;
    odooProductCategories: OdooOption[];
    odooPosCategories: OdooOption[];
    onSubmit: (e: React.FormEvent) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLFormElement>) => void;
    onFieldChange: (field: keyof ProductFormState, value: string | number) => void;
    onFieldsUpdate: (fields: Partial<ProductFormState>) => void;
}

export default function ProductFormSection({
    form,
    departement,
    currentCodeRemise,
    odooProductCategories,
    odooPosCategories,
    onSubmit,
    onKeyDown,
    onFieldChange,
    onFieldsUpdate,
}: Props) {
    // ─── Lookup HS code (auto-fill Odoo) ────────────────────
    const { lookup, isLooking, status } = useHsCodeLookup({
        form,
        departement,
        currentCodeRemise,
        onFieldsUpdate,
    });

    const handleHsCodeBlur = useCallback(
        (
            e?:
                | React.FocusEvent<HTMLInputElement>
                | React.KeyboardEvent<HTMLInputElement>,
        ) => {
            const value =
                e && "target" in e && e.target
                    ? (e.target as HTMLInputElement).value
                    : form.codeHs;
            void lookup(value);
        },
        [lookup, form.codeHs],
    );

    // Mapping statut hook → prop `autoFillSuccess` (bool | null)
    const autoFillSuccess =
        status === "success" ? true : status === "not-found" ? false : null;

    return (
        <ReportSection index={3} title="Ajouter un produit">
            <form
                onSubmit={onSubmit}
                onKeyDown={onKeyDown}
                className="rounded-lg border border-border/60 bg-card shadow-2xs p-4 space-y-4"
            >
                <HsCodeInput
                    codeHs={form.codeHs}
                    nom={form.nom}
                    quantity={form.quantity}
                    autoFilling={isLooking}
                    autoFillSuccess={autoFillSuccess}
                    onFieldChange={onFieldChange}
                    onHsCodeBlur={handleHsCodeBlur}
                />

                <CharacteristicsGrid
                    form={form}
                    odooProductCategories={odooProductCategories}
                    odooPosCategories={odooPosCategories}
                    onFieldChange={onFieldChange}
                />

                <PricingGrid
                    form={form}
                    departement={departement}
                    currentCodeRemise={currentCodeRemise}
                    onFieldChange={onFieldChange}
                />

                <div className="pt-3 border-t border-border/60 flex justify-end">
                    <Button
                        type="submit"
                        size="sm"
                        className="h-7 px-3 text-[11px] gap-1.5"
                    >
                        <Plus size={12} /> Ajouter la ligne
                    </Button>
                </div>
            </form>
        </ReportSection>
    );
}