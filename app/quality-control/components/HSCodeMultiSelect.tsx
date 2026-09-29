"use client";

import { FilterMultiSelect, type FilterOption } from "./FilterMultiSelect";

export default function HSCodeMultiSelect({ options }: { options: FilterOption[] }) {
  return (
    <FilterMultiSelect
      options={options}
      paramKey="hs_codes"
      placeholder="Filtrer par HS Code"
      emptyMessage="Aucun code HS trouvé pour cette période."
      mono
    />
  );
}