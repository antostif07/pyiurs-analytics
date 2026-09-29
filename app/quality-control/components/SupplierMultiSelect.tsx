"use client";

import { Truck } from "lucide-react";
import { FilterMultiSelect, type FilterOption } from "./FilterMultiSelect";

export default function SupplierMultiSelect({ options }: { options: FilterOption[] }) {
    return (
        <FilterMultiSelect
            options={options}
            paramKey="suppliers"
            icon={Truck}
            placeholder="Filtrer par fournisseur"
            emptyMessage="Aucun fournisseur trouvé pour cette période."
        />
    );
}