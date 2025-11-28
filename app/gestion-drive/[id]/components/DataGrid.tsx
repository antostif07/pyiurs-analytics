'use client';

import { useState, useEffect, useMemo, KeyboardEvent, ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MultilineEditor from './MultilineEditor';
import FileAttachmentManager from './FileAttachmentManager';
import { CellData, DocumentColumn, DocumentRow, FileAttachment, MultilineData, SubColumn } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
import FileCellPreview from './FileCellPreview';

// --- TYPES ---
interface DisplayRow {
  originalRow: DocumentRow;
  visualRowIndex: number;
  rowSpan: number;
  isFirstVisualRow: boolean;
}

interface DataGridProps {
  documentId: string;
  columns: DocumentColumn[];
  rows: DocumentRow[];
  cellData: CellData[];
  onRowsChange: (rows: DocumentRow[]) => void;
  onCellDataChange: (cellData: CellData[]) => void;
}


// --- SOUS-COMPOSANT POUR L'AFFICHAGE D'UNE LIGNE MULTILIGNE ---
function MultilineCellDisplay({
    cell,
    visualRowIndex,
    multilineData,
    fileAttachments,
    subColumns,
    onOpenFileUploader,
    onOpenFile
}: {
    cell: CellData;
    visualRowIndex: number;
    multilineData: MultilineData[];
    fileAttachments: FileAttachment[];
    subColumns: SubColumn[];
    onOpenFileUploader: (parentId: string) => void;
    onOpenFile: (file: FileAttachment, url: string) => void;
}) {
    const multilineEntriesByOrder = useMemo(() => {
        const entries = multilineData.filter(md => md.cell_data_id === cell.id);
        const grouped: Record<number, MultilineData[]> = {};
        for (const entry of entries) {
            if (!grouped[entry.order_index]) grouped[entry.order_index] = [];
            grouped[entry.order_index].push(entry);
        }
        return Object.values(grouped);
    }, [multilineData, cell.id]);

    const currentLineEntries = multilineEntriesByOrder[visualRowIndex];
    if (!currentLineEntries) return <div className="w-full h-full bg-gray-50 dark:bg-gray-800/50"></div>;

    return (
        <div className="flex w-full h-full items-center p-1 space-x-2 text-gray-800 dark:text-gray-300">
            {subColumns.map(subCol => {
                const entry = currentLineEntries.find(e => e.sub_column_id === subCol.id);
                if (!entry) return <div key={subCol.id} style={{ width: subCol.width }} className="flex-shrink-0"></div>;

                let content: React.ReactNode = '';
                switch (entry.value_type) {
                    case 'file':
                        const files = fileAttachments.filter(f => f.multiline_data_id === entry.id);
                        content = <FileCellPreview files={files} onOpenManager={() => onOpenFileUploader(entry.id)} />;
                        break;
                    case 'boolean':
                        content = entry.boolean_value ? '✅' : '❌';
                        break;
                    case 'date':
                        content = entry.date_value ? new Date(entry.date_value).toLocaleDateString('fr-FR') : '';
                        break;
                    default:
                        content = entry.text_value || entry.number_value?.toString() || '';
                }
                return (
                    <div key={subCol.id} style={{ width: subCol.width }} className="flex-shrink-0 text-xs truncate border-r dark:border-gray-600 last:border-r-0 px-2 flex items-center h-full">
                        {content}
                    </div>
                );
            })}
        </div>
    );
}

// --- COMPOSANT PRINCIPAL DATAGRID ---

export default function DataGrid({
  documentId,
  columns,
  rows,
  cellData,
  onRowsChange,
  onCellDataChange
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [multilineData, setMultilineData] = useState<MultilineData[]>([]);
  const [subColumns, setSubColumns] = useState<SubColumn[]>([]);
  const [displayRows, setDisplayRows] = useState<DisplayRow[]>([]);
  
  const [multilineEditor, setMultilineEditor] = useState<{ isOpen: boolean; cellDataId: string; parentColumn: DocumentColumn | null }>({ isOpen: false, cellDataId: '', parentColumn: null });
  const [fileManager, setFileManager] = useState<{ isOpen: boolean; parentId: string; parentType: 'cell' | 'multiline' }>({ isOpen: false, parentId: '', parentType: 'cell' });

  const [viewerFile, setViewerFile] = useState<{file: FileAttachment, url: string} | null>(null);

  const handleOpenFile = (file: FileAttachment, url: string) => {
        setViewerFile({ file, url });
    };

  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);
  const { user } = useAuth();

  useEffect(() => {
    fetchAdditionalData();
  }, [cellData]);

  useEffect(() => {
    const newDisplayRows: DisplayRow[] = [];
    rows.forEach(row => {
      const multilineCells = cellData.filter(c => {
        const col = columns.find(col => col.id === c.column_id);
        return c.row_id === row.id && col?.data_type === 'multiline';
      });

      let maxEntries = 1;
      if (multilineCells.length > 0) {
        const entryCounts = multilineCells.map(cell => {
          const uniqueIndices = new Set(multilineData.filter(md => md.cell_data_id === cell.id).map(md => md.order_index));
          return uniqueIndices.size;
        });
        if(entryCounts.length > 0) {
            maxEntries = Math.max(1, ...entryCounts);
        }
      }

      for (let i = 0; i < maxEntries; i++) {
        newDisplayRows.push({
          originalRow: row,
          visualRowIndex: i,
          rowSpan: maxEntries,
          isFirstVisualRow: i === 0,
        });
      }
    });
    setDisplayRows(newDisplayRows);
  }, [rows, cellData, multilineData, columns]);

  const fetchAdditionalData = async () => {
    if (cellData.length === 0) {
      setFileAttachments([]); setMultilineData([]); setSubColumns([]); return;
    }
    try {
      const cellIds = cellData.map(cell => cell.id);
      if (cellIds.length === 0) return; // Garde-fou
      
      const multilineColumnIds = columns.filter(c => c.data_type === 'multiline').map(c => c.id);

      // 1. Récupérer les données multilignes
      const { data: multilineResData, error: multilineError } = await supabase
        .from('multiline_data').select('*').in('cell_data_id', cellIds);
      if (multilineError) throw multilineError;
      setMultilineData(multilineResData || []);
      
      const multilineDataIds = multilineResData?.map(md => md.id) || [];

      // 🔥 LA CORRECTION EST ICI 🔥
      // On utilise .or() pour récupérer les fichiers liés aux DEUX types de parents en une seule requête.
      // S'il n'y a pas d'IDs pour un type, on s'assure que la requête reste valide.
      const orQuery = [
        `cell_data_id.in.(${cellIds.join(',')})`,
        multilineDataIds.length > 0 ? `multiline_data_id.in.(${multilineDataIds.join(',')})` : null
      ].filter(Boolean).join(','); // `filter(Boolean)` enlève les valeurs nulles

      const { data: filesResData, error: filesError } = await supabase
        .from('file_attachments')
        .select('*')
        .or(orQuery);
      if (filesError) throw filesError;
      setFileAttachments(filesResData || []);
      
      // 3. Récupérer les sous-colonnes
      if (multilineColumnIds.length > 0) {
        const { data: subColsData, error: subColsError } = await supabase
          .from('sub_columns').select('*').in('parent_column_id', multilineColumnIds);
        if (subColsError) throw subColsError;
        setSubColumns(subColsData || []);
      } else {
        setSubColumns([]);
      }

    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const getCellValue = (rowId: string, columnId: string) => {
    const cell = cellData.find(c => c.row_id === rowId && c.column_id === columnId);
    if (!cell) return '';

    switch (cell.value_type) {
      case 'text':
      case 'select':
        return cell.text_value || '';
      case 'number':
        return cell.number_value?.toString() || '';
      case 'date':
        return cell.date_value ? new Date(cell.date_value).toLocaleDateString('fr-FR') : '';
      case 'boolean':
        return cell.boolean_value ? 'Oui' : 'Non';
      default:
        return '';
    }
  };

  const startEditing = (rowId: string, columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (!column || column.data_type === 'multiline' || column.data_type === 'file') return;

    const currentValue = getCellValue(rowId, columnId);
    setEditValue(column.data_type === 'boolean' ? (currentValue === 'Oui' ? 'true' : 'false') : currentValue);
    setEditingCell({ rowId, columnId });
  };

  const handleCellClick = async (rowId: string, column: DocumentColumn) => {
    if (!user) return;
    let cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);

    if (!cell && (column.data_type === 'multiline' || column.data_type === 'file')) {
      try {
        const { data: newCell, error } = await supabase.from('cell_data').insert({
          row_id: rowId, column_id: column.id, value_type: column.data_type, created_by: user.id, updated_by: user.id,
        }).select().single();
        if (error) throw error;
        onCellDataChange([...cellData, newCell]);
        cell = newCell;
      } catch (error) { console.error("Error creating cell:", error); return; }
    }

    if (!cell) { startEditing(rowId, column.id); return; }

    if (column.data_type === 'multiline') {
      setMultilineEditor({ isOpen: true, cellDataId: cell.id, parentColumn: column });
    } else if (column.data_type === 'file') {
      setFileManager({ isOpen: true, parentId: cell.id, parentType: 'cell' });
    } else {
      startEditing(rowId, column.id);
    }
  };

  const getDisplayValue = (rowId: string, column: DocumentColumn): string => {
    const cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);
    if (!cell) return '';
    switch (cell.value_type) {
      case 'text': case 'select': return cell.text_value || '';
      case 'number': return cell.number_value?.toString() || '';
      case 'date': return cell.date_value ? new Date(cell.date_value).toLocaleDateString('fr-FR') : '';
      case 'boolean': return cell.boolean_value ? 'Oui' : 'Non';
      default: return '';
    }
  };

  const handleFilesChange = (newlyUploadedFiles: FileAttachment[], deletedFileId?: string) => {
    fetchAdditionalData(); // The simplest way to ensure all states are in sync
  };
  
  // (saveCell, addNewRow, deleteRow... etc. restent les mêmes, pas besoin de les modifier)
  
  return (
    <>
      <div className="overflow-auto bg-white dark:bg-gray-900">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 min-w-12 z-20">#</th>
              {sortedColumns.map(column => (
                <th key={column.id} className="border border-gray-300 dark:border-gray-600 p-2 sticky top-0 bg-gray-100 dark:bg-gray-800 z-10" style={{ width: column.width }}>
                  <span>{column.label}</span>
                  {column.data_type === 'multiline' && (
                    <div className="flex text-xs font-normal text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 mt-1 pt-1 space-x-2">
                        {subColumns.filter(sc => sc.parent_column_id === column.id).map(sc => (
                            <span key={sc.id} style={{ width: sc.width}} className="flex-shrink-0 truncate">{sc.label}</span>
                        ))}
                    </div>
                  )}
                </th>
              ))}
              <th className="sticky right-0 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 min-w-16 z-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((displayRow) => (
              <tr key={`${displayRow.originalRow.id}-${displayRow.visualRowIndex}`} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {displayRow.isFirstVisualRow && (
                  <td rowSpan={displayRow.rowSpan} className="sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 border border-gray-300 dark:border-gray-600 p-2 text-center text-gray-500">
                    {rows.findIndex(r => r.id === displayRow.originalRow.id) + 1}
                  </td>
                )}
                
                {sortedColumns.map(column => {
                  const cell = cellData.find(c => c.row_id === displayRow.originalRow.id && c.column_id === column.id);

                  if (column.data_type === 'multiline') {
                    return (
                      <td key={column.id} 
                        className="border border-gray-300 dark:border-gray-600 p-0 h-12 align-top" 
                        style={{ backgroundColor: column.background_color }}
                        onClick={() => cell && handleCellClick(displayRow.originalRow.id, column)}>
                        {cell && (
                          <MultilineCellDisplay
                            cell={cell}
                            visualRowIndex={displayRow.visualRowIndex}
                            multilineData={multilineData}
                            fileAttachments={fileAttachments}
                            subColumns={subColumns.filter(sc => sc.parent_column_id === column.id)}
                            onOpenFileUploader={(parentId) => setFileManager({ isOpen: true, parentId, parentType: 'multiline' })}
                            onOpenFile={handleOpenFile} 
                          />
                        )}
                      </td>
                    );
                  }
                  
                  if (displayRow.isFirstVisualRow) {
                    return (
                      <td
                        key={column.id} 
                        rowSpan={displayRow.rowSpan} 
                        className="border border-gray-300 dark:border-gray-600 p-0 h-12 align-top"
                        style={{
                          backgroundColor: column.background_color,
                          color: column.text_color,
                        }}
                    >
                         {column.data_type === 'file' ? (
                            <FileCellPreview
                                files={cell ? fileAttachments.filter(f => f.cell_data_id === cell.id) : []}
                                onOpenManager={() => handleCellClick(displayRow.originalRow.id, column)}
                            />
                         ) : (
                            <div onClick={() => handleCellClick(displayRow.originalRow.id, column)} className="w-full h-full p-2 cursor-cell whitespace-pre-wrap break-words">
                               {getDisplayValue(displayRow.originalRow.id, column)}
                            </div>
                         )}
                      </td>
                    );
                  }
                  
                  return null;
                })}

                {displayRow.isFirstVisualRow && (
                  <td rowSpan={displayRow.rowSpan} className="sticky right-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50 border border-gray-300 dark:border-gray-600 p-0">
                     <button className="w-full h-full text-red-500"> {/* ... Votre bouton de suppression ... */} </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {multilineEditor.isOpen && multilineEditor.parentColumn && (
          <MultilineEditor
            cellDataId={multilineEditor.cellDataId}
            parentColumn={multilineEditor.parentColumn}
            isOpen={multilineEditor.isOpen}
            onClose={() => {
                setMultilineEditor({ isOpen: false, cellDataId: '', parentColumn: null });
                fetchAdditionalData();
            }}
          />
      )}
      
      <FileAttachmentManager
        parentId={fileManager.parentId}
        parentType={fileManager.parentType}
        existingFiles={fileAttachments.filter(f => 
            (fileManager.parentType === 'cell' && f.cell_data_id === fileManager.parentId) ||
            (fileManager.parentType === 'multiline' && f.multiline_data_id === fileManager.parentId)
        )}
        onFilesChange={handleFilesChange}
        isOpen={fileManager.isOpen}
        onClose={() => setFileManager({ isOpen: false, parentId: '', parentType: 'cell' })}
      />
    </>
  );
}