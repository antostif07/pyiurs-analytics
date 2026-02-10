// app/gestion-drive/[id]/utils/filter-logic.ts

export const applyFilters = (
  rows: any[], 
  cellMap: Map<string, any>, // On accepte la Map directement
  searchQuery: string, 
  filters: any, 
  sortConfig: any,
  columns: any[]
) => {
  let result = [...rows];

  // 1. Recherche Globale
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(row => 
      columns.some(col => {
        // On utilise le délimiteur "_" pour correspondre au hook
        const cell = cellMap.get(`${row.id}_${col.id}`);
        // On vérifie tous les types de valeurs possibles
        const value = cell?.text_value || cell?.number_value || cell?.date_value || '';
        return String(value).toLowerCase().includes(q);
      })
    );
  }

  // 2. Tri optimisé via la Map
  if (sortConfig) {
    result.sort((a, b) => {
      const cellA = cellMap.get(`${a.id}_${sortConfig.column}`);
      const cellB = cellMap.get(`${b.id}_${sortConfig.column}`);
      
      const valA = cellA?.text_value || cellA?.number_value || '';
      const valB = cellB?.text_value || cellB?.number_value || '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      return sortConfig.direction === 'asc' 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
  }

  return result;
};