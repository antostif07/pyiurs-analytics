'use client'
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CellData, Document, DocumentColumn, DocumentRow, FileAttachment, MultilineData, SubColumn } from "@/app/types/documents";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Footer from "@/components/footer";
import DocumentGrid from "./components/DocumentGrid";
import { FilterState } from "@/app/types/search";
import SearchAndFilters from "./components/SearchAndFilters";
import Link from "next/link";
import PermissionManager from "./components/PermissionManager";

const applyComplexFilter = (
    value: string | number | boolean | undefined | null, 
    filter: { min?: number; max?: number; start?: Date | string; end?: Date | string }
) => {
    // Si la valeur est null ou undefined, elle ne passe pas les filtres de plage
    if (value === undefined || value === null) return false;

    // Filtres Numériques
    if (filter.min !== undefined && typeof value === "number" && value < filter.min) return false;
    if (filter.max !== undefined && typeof value === "number" && value > filter.max) return false;
    
    // Filtres Dates
    if (filter.start || filter.end) {
        // Tenter de convertir la valeur en Date si ce n'est pas déjà le cas
        const dateValue: Date = (value as any) instanceof Date ? (value as unknown as Date) : new Date(String(value));
        // Vérifier si la date est valide
        if (isNaN(dateValue.getTime())) return false;

        if (filter.start) {
            const startDate = new Date(filter.start);
            if (dateValue < startDate) return false;
        }
        if (filter.end) {
            const endDate = new Date(filter.end);
            if (dateValue > endDate) return false;
        }
    }
    return true;
};

export default function DocumentEditor() {
    const params = useParams()
    const router = useRouter();
    const documentId = params.id as string;
    const [darkMode, setDarkMode] = useState(false);
    const [document, setDocument] = useState<Document | null>(null);
    const [columns, setColumns] = useState<DocumentColumn[]>([]);
    const [rows, setRows] = useState<DocumentRow[]>([]);
    const [cellData, setCellData] = useState<CellData[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, profile, loading: authLoading } = useAuth();
    const [subColumns, setSubColumns] = useState<SubColumn[]>([]);
    const [multilineData, setMultilineData] = useState<MultilineData[]>([]);
    const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);

    const [filteredRows, setFilteredRows] = useState<DocumentRow[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<FilterState>({});
    const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

    const getCellDisplayValue = (cell: CellData) => {
      switch (cell.value_type) {
        case 'text': return cell.text_value;
        case 'number': return cell.number_value;
        case 'date': return cell.date_value;
        case 'boolean': return cell.boolean_value;
        case 'select': return cell.text_value; // Gestion du type select
        default: return '';
      }
    };

    const applyFiltersAndSearch = useCallback(() => {
      let filtered = [...rows];

      // Appliquer la recherche globale
      if (searchQuery) {
        filtered = filtered.filter(row => {
          return columns.some(column => {
            const cell = cellData.find(c => c.row_id === row.id && c.column_id === column.id);
            const value = cell ? getCellDisplayValue(cell) : '';
            return String(value).toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      // Appliquer les filtres spécifiques par colonne
      if (Object.keys(filters).length > 0) {
        filtered = filtered.filter(row => {
          return Object.entries(filters).every(([columnId, filterValue]) => {
            const cell = cellData.find(c => c.row_id === row.id && c.column_id === columnId);
            const value = cell ? getCellDisplayValue(cell) : undefined;
            
            // Filtre Simple (Texte, Select, Boolean)
            if (typeof filterValue === 'string') {
                // Pour un select ou boolean, on pourrait vouloir une égalité stricte, 
                // mais includes permet plus de souplesse.
                return String(value ?? '').toLowerCase().includes(filterValue.toLowerCase());
            } 
            // Filtre Complexe (Nombre, Date)
            else if (typeof filterValue === 'object' && filterValue !== null) {
              return applyComplexFilter(
                value, 
                filterValue as { min?: number; max?: number; start?: Date | string; end?: Date | string }
              );
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
          
          // Gestion du tri numérique pour éviter "10" < "2"
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
          }

          // Tri alphabétique standard
          if (sortConfig.direction === 'asc') {
            return String(valueA).localeCompare(String(valueB));
          } else {
            return String(valueB).localeCompare(String(valueA));
          }
        });
      }

      setFilteredRows(filtered);
    }, [rows, searchQuery, filters, sortConfig, cellData, columns]);

    useEffect(() => {
        applyFiltersAndSearch();
    }, [rows, searchQuery, filters, sortConfig, cellData]);

    useEffect(() => {
        if (!authLoading && !user) {
          router.push('/login');
        }
    }, [user, authLoading, router]);
      
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

    const fetchDocumentData = useCallback(async () => {
        try {
            setLoading(true);
    
            // 1. Fetch document
            const { data: docData, error: docError } = await supabase
                .from('documents')
                .select('*')
                .eq('id', documentId)
                .single();
    
            if (docError) throw docError;
            setDocument(docData);
    
            // 2. Fetch columns
            const { data: columnsData, error: columnsError } = await supabase
                .from('document_columns')
                .select('*')
                .eq('document_id', documentId)
                .order('order_index', { ascending: true });
    
            if (columnsError) throw columnsError;
            setColumns(columnsData || []);

            // 3. Fetch rows
            const { data: rowsData, error: rowsError } = await supabase
                .from('document_rows')
                .select('*')
                .eq('document_id', documentId)
                .order('order_index');
    
            if (rowsError) throw rowsError;
            setRows(rowsData || []);
            
            // 4. Fetch Sub Columns
            const { data: subColsData, error: subColsError } = await supabase
                .from('sub_columns')
                .select('*')
                .order('order_index');
            
            if (subColsError) throw subColsError;
            setSubColumns(subColsData || []);

            let fetchedCellData: CellData[] = [];

            // 5. Fetch cell data
            if (rowsData && rowsData.length > 0) {
                const { data: cells, error: cellError } = await supabase
                .from('cell_data')
                .select('*')
                .in('row_id', rowsData.map((row: DocumentRow) => row.id)); // Typage explicite
    
                if (cellError) throw cellError;
                
                fetchedCellData = cells || [];
                setCellData(fetchedCellData); // Mise à jour du state
            } else {
                setCellData([]);
            }

            // 6. Fetch Multiline Data (En utilisant la variable locale fetchedCellData)
            if (fetchedCellData.length > 0) {
                const ids = fetchedCellData
                    .map(c => c.id)
                    .filter(id => typeof id === "string" && id.length > 0);
                const { data: multiData, error } = await supabase.rpc(
                "get_multiline_by_cells",
                { cell_ids: ids } // ton tableau de UUID
                );

                if (error) console.error(error);

                const multiline = multiData || [];
                setMultilineData(multiline);
                // const { data: multiData, error: multiError } = await supabase
                //     .from("multiline_data")
                //     .select(`
                //         id,
                //         cell_data_id,
                //         sub_column_id,
                //         order_index,
                //         text_value,
                //         number_value,
                //         date_value,
                //         boolean_value,
                //         value_type,
                //         created_at,
                //         updated_at,
                //         sub_columns (
                //         id,
                //         label,
                //         data_type,
                //         order_index
                //         )
                //     `)
                //     .in("cell_data_id", ids);

                // if (multiError) throw multiError;

                // setMultilineData(multiData || []);
            } else {
                setMultilineData([]);
            }

            // 7. Fetch File Attachments (NOUVEAU)
            if (fetchedCellData.length > 0) {
                const ids = fetchedCellData.map(c => c.id);

                const { data, error } = await supabase.rpc(
                    "get_files_by_cells",
                    { cell_ids: ids }
                );

                if (error) {
                    console.error(error);
                    throw error;
                }

                setFileAttachments(data || []);
            } else {
                setFileAttachments([]);
            }
        } catch (error) {
          console.error('Error fetching document data:', error);
        } finally {
          setLoading(false);
        }
      }, [documentId, user]);
    
    useEffect(() => {
        if (documentId && user) {
        fetchDocumentData();
        }
    }, [documentId, user, fetchDocumentData]);

    if (!user || !document) {
        return null;
    }

    const isOwner = user.id === document.created_by;

    return (
        <div
        className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br 
        from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 
        transition-colors grid grid-rows-[auto_1fr_auto]`}
        >
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
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                            <span>{document.name}</span>
                            {isOwner && (
                                <span 
                                className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full"
                                title="Vous êtes le propriétaire de ce document"
                                >
                                👑 Propriétaire
                                </span>
                            )}
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
                    {/* <button
                        onClick={() => setShowConfig(!showConfig)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                        showConfig 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        <span>⚙️</span>
                        <span>{showConfig ? 'Masquer configuration' : 'Configurer colonnes'}</span>
                    </button> */}

                    {/* 🔥 CORRECTION : Passer documentOwnerId au PermissionManager */}
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
                        documentOwnerId={document.created_by} // 🔥 IMPORTANT : Passer l'ID du propriétaire
                    />
                    </div>
                    
                    <div className="flex items-center space-x-3">
                    {/* <ExportImport
                        documentId={documentId}
                        columns={columns}
                        rows={rows}
                        cellData={cellData}
                    /> */}
                    
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
            {/* <DocumentEditorHeader
                document={document}
                handleDocument={setDocument}
                updateDocumentName={updateDocumentName}
                isOwner={isOwner}
                setDarkMode={setDarkMode}
                darkMode={darkMode}
                user={user}
                profile={profile}
                columns={columns}
                cellData={cellData}
                rows={rows}
            /> */}
            {/* <SearchAndFilters
              columns={columns}
              onSearch={setSearchQuery}
              onFilter={setFilters}
              onSort={setSortConfig}
            /> */}
            <div className="min-h-0 overflow-auto flex">
                <DocumentGrid
                    document={document}
                    columns={columns}
                    rows={filteredRows}
                    cellData={cellData}
                    fetchDocumentData={fetchDocumentData}
                    subColumns={subColumns}
                    multilineData={multilineData}
                    fileAttachments={fileAttachments}
                />
            </div>
            <Footer user={user} />
        </div>
    )
}