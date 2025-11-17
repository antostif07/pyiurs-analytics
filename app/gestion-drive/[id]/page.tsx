'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ColumnConfigPanel from './components/ColumnConfigPanel';
import DataGrid from './components/DataGrid';
import SearchAndFilters from './components/SearchAndFilters';
import ExportImport from './components/ExportImport';
import PermissionManager from './components/PermissionManager';
import { DocumentColumn, Document, DocumentRow, CellData } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
import { FilterState, FilterValue } from '@/app/types/search';
import Footer from '@/components/footer';

export default function DocumentEditor() {
  const params = useParams();
  const documentId = params.id as string;
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [columns, setColumns] = useState<DocumentColumn[]>([]);
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [cellData, setCellData] = useState<CellData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // États pour recherche/filtres
  const [filteredRows, setFilteredRows] = useState<DocumentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  const fetchDocumentData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch document
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;
      setDocument(docData)

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('document_columns')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index');

      if (columnsError) throw columnsError;
      setColumns(columnsData || []);
      

      // Fetch rows
      const { data: rowsData, error: rowsError } = await supabase
        .from('document_rows')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index');

      if (rowsError) throw rowsError;
      setRows(rowsData || []);

      // Fetch cell data if rows exist
      if (rowsData && rowsData.length > 0) {
        const { data: cellData, error: cellError } = await supabase
          .from('cell_data')
          .select('*')
          .in('row_id', rowsData.map((row: CellData) => row.id));

        if (cellError) throw cellError;
        setCellData(cellData || []);
      }
      
    } catch (error) {
      console.error('Error fetching document data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (documentId && user) {
      fetchDocumentData();
    }
  }, [documentId, user, fetchDocumentData]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [rows, searchQuery, filters, sortConfig, cellData]);

  const updateDocumentName = async () => {
    if (!document) return;

    try {
      const newName = document.editName || document.name;
      
      const { error } = await supabase
        .from('documents')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        } as never)
        .eq('id', documentId);

      if (error) throw error;

      // Mettre à jour localement
      setDocument(prev => prev ? {
        ...prev, 
        name: newName,
        isEditing: false,
        editName: '',
        updated_at: new Date().toISOString()
      } : null);

    } catch (error) {
      console.error('Error updating document name:', error);
      alert('Erreur lors du renommage du document.');
    }
  };

  const applyFiltersAndSearch = () => {
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
            return applyComplexFilter(value, filterValue as { min: number | undefined; max: number; start: Date | undefined; end: Date | undefined });
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
  };

  const getCellDisplayValue = (cell: CellData) => {
    switch (cell.value_type) {
      case 'text': return cell.text_value;
      case 'number': return cell.number_value;
      case 'date': return cell.date_value;
      case 'boolean': return cell.boolean_value;
      default: return '';
    }
  };

  const applyComplexFilter = (value: string | number | boolean | undefined, filter: {min: number|undefined, max: number, start: Date|undefined, end: Date|undefined}) => {
    if (filter.min !== undefined && typeof value === "number" && value < filter.min) return false;
    if (filter.max !== undefined && typeof value === "number" && value > filter.max) return false;
    if (filter.start && typeof value === "string" && new Date(value) < new Date(filter.start)) return false;
    if (filter.end && typeof value === "string" && new Date(value) > new Date(filter.end)) return false;
    return true;
  };

  const addNewRow = async () => {
    try {
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const newOrderIndex = rows.length > 0 ? Math.max(...rows.map(r => r.order_index)) + 1 : 0;

      const { data, error } = await supabase
        .from('document_rows')
        .insert([
          {
            document_id: documentId,
            order_index: newOrderIndex,
            created_by: user.id,
            updated_by: user.id
          } as never
        ])
        .select()
        .single();

      if (error) throw error;
      setRows(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding row:', error);
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (!user || !document) {
    return null;
  }

  return (
    <div
    className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br 
    from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 
    transition-colors grid grid-rows-[auto_1fr_auto]`}
  >
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/gestion-drive"
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-lg"
              >
                <span>←</span>
                <span className="hidden sm:inline">Mes Documents</span>
                <span className="sm:hidden">Retour</span>
              </Link>
              
              {/* Séparateur */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              
              {/* Nom du document avec édition */}
              <div className="flex items-center space-x-2 group">
                {document.isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={document.editName || document.name}
                      onChange={(e) => setDocument(prev => prev ? {...prev, editName: e.target.value} : null)}
                      className="px-3 py-1 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold min-w-[200px]"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          await updateDocumentName();
                        } else if (e.key === 'Escape') {
                          setDocument(prev => prev ? {...prev, isEditing: false, editName: ''} : null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={updateDocumentName}
                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        title="Sauvegarder"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => setDocument(prev => prev ? {...prev, isEditing: false, editName: ''} : null)}
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Annuler"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      {document.name}
                    </h1>
                    <button
                      onClick={() => setDocument(prev => prev ? {...prev, isEditing: true, editName: prev.name} : null)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                      title="Renommer le document"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>

              {/* Description */}
              {document.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm hidden lg:block border-l border-gray-300 dark:border-gray-600 pl-4">
                  {document.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mode sombre/clair */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              
              {/* Avatar utilisateur */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  showConfig 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>⚙️</span>
                <span>{showConfig ? 'Masquer configuration' : 'Configurer colonnes'}</span>
              </button>

              <PermissionManager
                documentId={documentId}
                currentPermissions={document?.default_permissions}
                onPermissionsChange={async (newPermissions) => {
                  try {
                    const { error } = await supabase
                      .from('documents')
                      .update({ 
                        default_permissions: newPermissions,
                        updated_at: new Date().toISOString()
                      } as never)
                      .eq('id', documentId);
                    
                    if (error) throw error;
                    
                    // Mettre à jour le document localement
                    setDocument(prev => prev ? {
                      ...prev,
                      default_permissions: newPermissions,
                      updated_at: new Date().toISOString()
                    } : null);
                    
                  } catch (error) {
                    console.error('Error updating permissions:', error);
                    alert('Erreur lors de la mise à jour des permissions.');
                  }
                }}
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <ExportImport
                documentId={documentId}
                columns={columns}
                rows={rows}
                cellData={cellData}
              />
              
              <button
                onClick={addNewRow}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Ajouter ligne</span>
              </button>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <SearchAndFilters
            columns={columns}
            onSearch={setSearchQuery}
            onFilter={setFilters}
            onSort={setSortConfig}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-0 overflow-auto">
        {/* Configuration Panel */}
        {showConfig && (
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <ColumnConfigPanel
              documentId={documentId}
              columns={columns}
              onColumnsChange={setColumns}
            />
          </div>
        )}

        {/* Data Grid */}
        <div className={`${showConfig ? 'flex-1' : 'w-full'} bg-white dark:bg-gray-900`}>
          <DataGrid
            documentId={documentId}
            columns={columns}
            rows={filteredRows}
            cellData={cellData}
            onRowsChange={setRows}
            onCellDataChange={setCellData}
          />
        </div>
      </div>

      {/* Footer */}
      <Footer user={user} />
    </div>
  );
}