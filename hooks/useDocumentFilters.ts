import { useState, useEffect } from 'react';
import { DocumentColumn, DocumentRow, CellData } from '@/app/types/documents';
import { FilterState } from '@/app/types/search';

export const useDocumentFilters = (
  rows: DocumentRow[], 
  columns: DocumentColumn[], 
  cellData: CellData[]
) => {
  const [filteredRows, setFilteredRows] = useState<DocumentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [sortConfig, setSortConfig] = useState<{ 
    column: string; 
    direction: 'asc' | 'desc' 
  } | null>(null);

  const getCellDisplayValue = (cell: CellData) => {
    switch (cell.value_type) {
      case 'text': return cell.text_value;
      case 'number': return cell.number_value;
      case 'date': return cell.date_value;
      case 'boolean': return cell.boolean_value;
      default: return '';
    }
  };

  const applyComplexFilter = (
    value: string | number | boolean | undefined, 
    filter: { min?: number; max?: number; start?: Date; end?: Date }
  ) => {
    if (filter.min !== undefined && typeof value === "number" && value < filter.min) return false;
    if (filter.max !== undefined && typeof value === "number" && value > filter.max) return false;
    if (filter.start && typeof value === "string" && new Date(value) < filter.start) return false;
    if (filter.end && typeof value === "string" && new Date(value) > filter.end) return false;
    return true;
  };

  useEffect(() => {
    let filtered = [...rows];

    // Appliquer la recherche
    if (searchQuery) {
      filtered = filtered.filter(row => {
        return columns.some(column => {
          const cell = cellData.find(c => c.row_id === row.id && c.column_id === column.id);
          const value = cell ? getCellDisplayValue(cell) : '';
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }

    // Appliquer les filtres
    if (Object.keys(filters).length > 0) {
      filtered = filtered.filter(row => {
        return Object.entries(filters).every(([columnId, filterValue]) => {
          const cell = cellData.find(c => c.row_id === row.id && c.column_id === columnId);
          const value = cell ? getCellDisplayValue(cell) : '';
          
          if (typeof filterValue === 'string') {
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          } else if (typeof filterValue === 'object') {
            return applyComplexFilter(value, filterValue);
          }
          return true;
        });
      });
    }

    // Appliquer le tri
    if (sortConfig?.column) {
      filtered.sort((a, b) => {
        const cellA = cellData.find(c => c.row_id === a.id && c.column_id === sortConfig.column);
        const cellB = cellData.find(c => c.row_id === b.id && c.column_id === sortConfig.column);
        
        const valueA = cellA ? getCellDisplayValue(cellA) : '';
        const valueB = cellB ? getCellDisplayValue(cellB) : '';
        
        if (sortConfig.direction === 'asc') {
          return String(valueA).localeCompare(String(valueB));
        } else {
          return String(valueB).localeCompare(String(valueA));
        }
      });
    }

    setFilteredRows(filtered);
  }, [rows, searchQuery, filters, sortConfig, cellData, columns]);

  return {
    filteredRows,
    searchQuery,
    filters,
    sortConfig,
    setSearchQuery,
    setFilters,
    setSortConfig
  };
};