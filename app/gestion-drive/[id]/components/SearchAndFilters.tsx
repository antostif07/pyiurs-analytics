// app/documents/[id]/components/SearchAndFilters.tsx
'use client';

import { DocumentColumn } from '@/app/types/documents';
import { useState } from 'react';

interface SearchAndFiltersProps {
  columns: DocumentColumn[];
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  onSort: (sort: { column: string; direction: 'asc' | 'desc' }) => void;
}

export default function SearchAndFilters({
  columns,
  onSearch,
  onFilter,
  onSort
}: SearchAndFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (columnId: string, value: any) => {
    const newFilters = { ...filters };
    if (value === '' || value === null) {
      delete newFilters[columnId];
    } else {
      newFilters[columnId] = value;
    }
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleSort = (columnId: string) => {
    const newDirection: "asc"|"desc" = sortConfig?.column === columnId && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const newSortConfig = { column: columnId, direction: newDirection };
    setSortConfig(newSortConfig);
    onSort(newSortConfig);
  };

  const clearAll = () => {
    setSearchQuery('');
    setFilters({});
    setSortConfig(null);
    onSearch('');
    onFilter({});
    onSort({ column: '', direction: 'asc' });
  };

  return (
    <div className="bg-white border-b p-4 space-y-4">
      {/* Barre de recherche */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher dans le document..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
        >
          <span>Filtres</span>
          <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        <button
          onClick={clearAll}
          className="px-3 py-2 text-gray-600 hover:text-gray-800"
        >
          Tout effacer
        </button>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map(column => (
              <div key={column.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {column.label}
                </label>
                
                {column.data_type === 'text' && (
                  <input
                    type="text"
                    placeholder="Filtrer..."
                    value={filters[column.id] || ''}
                    onChange={(e) => handleFilterChange(column.id, e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                )}
                
                {column.data_type === 'number' && (
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters[column.id]?.min || ''}
                      onChange={(e) => handleFilterChange(column.id, {
                        ...filters[column.id],
                        min: e.target.value ? parseFloat(e.target.value) : null
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters[column.id]?.max || ''}
                      onChange={(e) => handleFilterChange(column.id, {
                        ...filters[column.id],
                        max: e.target.value ? parseFloat(e.target.value) : null
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                )}
                
                {column.data_type === 'date' && (
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      placeholder="De"
                      value={filters[column.id]?.start || ''}
                      onChange={(e) => handleFilterChange(column.id, {
                        ...filters[column.id],
                        start: e.target.value
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                    <input
                      type="date"
                      placeholder="À"
                      value={filters[column.id]?.end || ''}
                      onChange={(e) => handleFilterChange(column.id, {
                        ...filters[column.id],
                        end: e.target.value
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                )}
                
                {column.data_type === 'boolean' && (
                  <select
                    value={filters[column.id] || ''}
                    onChange={(e) => handleFilterChange(column.id, e.target.value || null)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  >
                    <option value="">Tous</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Tri */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Trier par</h4>
            <div className="flex flex-wrap gap-2">
              {columns.map(column => (
                <button
                  key={column.id}
                  onClick={() => handleSort(column.id)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
                    sortConfig?.column === column.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{column.label}</span>
                  {sortConfig?.column === column.id && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}