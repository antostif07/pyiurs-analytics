// app/inventory/purchases/import-generator/_components/fields/characteristics-grid.tsx
"use client";

import NormalSelector from "../../../_components/normal-selector";
import type { OdooOption } from "../../../import-actions";
import type { ProductFormState } from "../../import-types";

interface Props {
    form: ProductFormState;
    odooProductCategories: OdooOption[];
    odooPosCategories: OdooOption[];
    onFieldChange: (field: keyof ProductFormState, value: string | number) => void;
}

const TEXT_FIELDS: { label: string; field: keyof ProductFormState }[] = [
    { label: "Marque", field: "marque" },
    { label: "Catégorie", field: "categorie" },
    { label: "Famille", field: "famille" },
    { label: "Couleur", field: "couleur" },
    { label: "Taille", field: "taille" },
];

export default function CharacteristicsGrid({
    form,
    odooProductCategories,
    odooPosCategories,
    onFieldChange,
}: Props) {
    return (
        <div className="space-y-3 pt-3 border-t border-border/60">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                2. Caractéristiques
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEXT_FIELDS.map(({ label, field }) => (
                    <div key={field} className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                            {label}
                        </label>
                        <input
                            type="text"
                            value={String(form[field] ?? "")}
                            onChange={(e) => onFieldChange(field, e.target.value)}
                            className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] outline-none"
                        />
                    </div>
                ))}

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Catégorie article
                    </label>
                    <NormalSelector
                        data={odooProductCategories}
                        selected={form.categorieArticle}
                        onSelect={(value) =>
                            onFieldChange("categorieArticle", value.name)
                        }
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Catégorie PdV
                    </label>
                    <select
                        value={form.categoriePdv}
                        onChange={(e) =>
                            onFieldChange("categoriePdv", e.target.value)
                        }
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] outline-none cursor-pointer"
                    >
                        <option value="">Sélectionner...</option>
                        {odooPosCategories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                        Date expiration
                    </label>
                    <input
                        type="text"
                        placeholder="2026-12"
                        value={form.dateExpiration}
                        onChange={(e) =>
                            onFieldChange("dateExpiration", e.target.value)
                        }
                        className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] outline-none"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">
                    Description
                </label>
                <input
                    type="text"
                    value={form.description}
                    onChange={(e) => onFieldChange("description", e.target.value)}
                    className="w-full h-9 bg-secondary/60 border border-border rounded-lg px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring"
                />
            </div>
        </div>
    );
}