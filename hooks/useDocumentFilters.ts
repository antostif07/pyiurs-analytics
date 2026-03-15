import { useState, useMemo } from 'react';
import { DocumentColumn, DocumentRow, CellData } from '@/app/types/documents';
import { FilterState } from '@/app/types/search';

export const useDocumentFilters = (
  rows: DocumentRow[], 
  columns: DocumentColumn[], 
  cellData: CellData[]
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [sortConfig, setSortConfig] = useState<{ 
    column: string; 
    direction: 'asc' | 'desc' 
  } | null>(null);

  // ✅ PRO 1 : Indexation des cellules (Map O(1))
  // Au lieu de faire des .find() lents, on crée un dictionnaire hyper rapide
  // Clé: "rowId_columnId" -> Valeur: la vraie valeur de la cellule
  const cellLookupMap = useMemo(() => {
    const map = new Map<string, string | number | boolean | Date | null>();
    
    for (const cell of cellData) {
      let value: string | number | boolean | Date | null = '';
      
      switch (cell.value_type) {
        case 'text': value = cell.text_value ?? ''; break;
        case 'number': value = cell.number_value ?? 0; break;
        case 'date': value = cell.date_value ? new Date(cell.date_value) : null; break;
        case 'boolean': value = cell.boolean_value ?? false; break;
      }
      
      map.set(`${cell.row_id}_${cell.column_id}`, value);
    }
    return map;
  }, [cellData]);

  // ✅ PRO 2 : Remplacement du useEffect par useMemo (Donnée dérivée pure)
  // React ne recalculera les lignes que si un des états change, SANS faire de double-rendu
  const filteredRows = useMemo(() => {
    let result =[...rows];

    // 1. Appliquer la recherche globale (Search)
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      
      result = result.filter(row => {
        return columns.some(column => {
          // 🚀 Lookup instantané O(1) au lieu de .find() O(N)
          const value = cellLookupMap.get(`${row.id}_${column.id}`);
          if (value == null) return false;
          
          return String(value).toLowerCase().includes(lowerQuery);
        });
      });
    }

    // 2. Appliquer les filtres par colonne
    if (Object.keys(filters).length > 0) {
      result = result.filter(row => {
        return Object.entries(filters).every(([columnId, filterValue]) => {
          const value = cellLookupMap.get(`${row.id}_${columnId}`);
          
          // Ignorer si vide et qu'on cherche quelque chose de précis
          if (value == null) return false; 
          
          if (typeof filterValue === 'string') {
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          } 
          
          if (typeof filterValue === 'object' && filterValue !== null) {
            const { min, max, start, end } = filterValue as any;
            
            if (min !== undefined && typeof value === "number" && value < min) return false;
            if (max !== undefined && typeof value === "number" && value > max) return false;
            if (start && value instanceof Date && value < start) return false;
            if (end && value instanceof Date && value > end) return false;
          }
          
          return true;
        });
      });
    }

    // 3. Appliquer le tri (Tri intelligent Numérique VS String)
    if (sortConfig?.column) {
      result.sort((a, b) => {
        const valueA = cellLookupMap.get(`${a.id}_${sortConfig.column}`);
        const valueB = cellLookupMap.get(`${b.id}_${sortConfig.column}`);
        
        // Pousser les valeurs nulles/vides en fin de tableau
        if (valueA == null) return 1;
        if (valueB == null) return -1;

        let comparison = 0;

        // ✅ PRO 3 : Tri numérique mathématique (1, 2, 10 au lieu de 1, 10, 2)
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } 
        // Tri de dates
        else if (valueA instanceof Date && valueB instanceof Date) {
          comparison = valueA.getTime() - valueB.getTime();
        } 
        // Tri textuel classique
        else {
          comparison = String(valueA).localeCompare(String(valueB));
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [rows, columns, cellLookupMap, searchQuery, filters, sortConfig]);

  return {
    filteredRows, // La variable est renvoyée instantanément sans décalage d'état
    searchQuery,
    filters,
    sortConfig,
    setSearchQuery,
    setFilters,
    setSortConfig
  };
};