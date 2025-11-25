// app/documents/[id]/components/DataGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MultilineEditor from './MultilineEditor';
// MODIFIÉ: Import du nouveau manager de fichiers
import FileAttachmentManager from './FileAttachmentManager';
import { CellData, DocumentColumn, DocumentRow, FileAttachment, MultilineData } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
import FileCellPreview from './FileCellPreview';

interface DataGridProps {
  documentId: string;
  columns: DocumentColumn[];
  rows: DocumentRow[];
  cellData: CellData[];
  onRowsChange: (rows: DocumentRow[]) => void;
  onCellDataChange: (cellData: CellData[]) => void;
}

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
  
  const [multilineEditor, setMultilineEditor] = useState<{
    isOpen: boolean;
    cellDataId: string;
    parentColumn: DocumentColumn;
  }>({ isOpen: false, cellDataId: '', parentColumn: null! });

  const [fileManager, setFileManager] = useState<{
    isOpen: boolean;
    parentId: string;
  }>({ isOpen: false, parentId: '' });

  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);
  const { user } = useAuth();

  useEffect(() => {
    fetchAdditionalData();
  }, [cellData]);

  const fetchAdditionalData = async () => {
    if (cellData.length === 0) {
      setFileAttachments([]);
      setMultilineData([]);
      return;
    }

    try {
      const cellIds = cellData.map(cell => cell.id);

      // Fetch file attachments pour les colonnes de type 'file'
      const { data: filesData, error: filesError } = await supabase
        .from('file_attachments')
        .select('*')
        .in('cell_data_id', cellIds);
      if (filesError) throw filesError;
      setFileAttachments(filesData || []);

      // Fetch multiline data pour les colonnes de type 'multiline'
      const { data: multiData, error: multiError } = await supabase
        .from('multiline_data')
        .select('*')
        .in('cell_data_id', cellIds);
      if (multiError) throw multiError;
      setMultilineData(multiData || []);

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

  const saveCell = async (rowId: string, columnId: string, value: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const column = columns.find(c => c.id === columnId);
      if (!column) return;

      const existingCell = cellData.find(c => c.row_id === rowId && c.column_id === columnId);

      let updatePayload: any = {
        value_type: column.data_type,
        updated_by: user.id,
        text_value: null, number_value: null, date_value: null, boolean_value: null
      };

      switch (column.data_type) {
        case 'number': updatePayload.number_value = value ? parseFloat(value) : null; break;
        case 'date': updatePayload.date_value = value ? new Date(value).toISOString() : null; break;
        case 'boolean': updatePayload.boolean_value = value === 'true'; break;
        case 'text':
        case 'select':
        default: updatePayload.text_value = value; break;
      }

      if (existingCell) {
        const { data, error } = await supabase.from('cell_data').update(updatePayload).eq('id', existingCell.id).select().single();
        if (error) throw error;
        onCellDataChange(cellData.map(cell => cell.id === existingCell.id ? data : cell));
      } else {
        const insertPayload = { row_id: rowId, column_id: columnId, created_by: user.id, ...updatePayload };
        const { data, error } = await supabase.from('cell_data').insert(insertPayload).select().single();
        if (error) throw error;
        onCellDataChange([...cellData, data]);
      }
    } catch (error) {
      console.error('Error saving cell:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, columnId: string) => {
    if (e.key === 'Enter') {
      saveCell(rowId, columnId, editValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleCellClick = async (rowId: string, column: DocumentColumn) => {
    if (!user) return;

    let cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);

    // Si la cellule pour un type spécial n'existe pas, la créer
    if (!cell && (column.data_type === 'multiline' || column.data_type === 'file')) {
      try {
        const { data: newCell, error } = await supabase.from('cell_data').insert({
          row_id: rowId,
          column_id: column.id,
          value_type: column.data_type,
          created_by: user.id,
          updated_by: user.id,
        }).select().single();

        if (error) throw error;
        onCellDataChange([...cellData, newCell]);
        cell = newCell;
      } catch (error) {
        console.error("Error creating cell on-the-fly:", error);
        return;
      }
    }

    if (!cell) {
        startEditing(rowId, column.id);
        return;
    }

    // Ouvrir l'éditeur approprié
    if (column.data_type === 'multiline') {
      setMultilineEditor({ isOpen: true, cellDataId: cell.id, parentColumn: column });
    } else if (column.data_type === 'file') {
      setFileManager({ isOpen: true, parentId: cell.id });
    } else {
      startEditing(rowId, column.id);
    }
  };

  const getDisplayValue = (rowId: string, column: DocumentColumn): string => {
    const cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);
    if (!cell) return '';
    if (column.data_type === 'multiline') {
      const entryCount = new Set(multilineData.filter(md => md.cell_data_id === cell.id).map(md => md.order_index)).size;
      return entryCount > 0 ? `${entryCount} entrée(s)` : '';
    }
    return getCellValue(rowId, column.id);
  };

  const renderCell = (rowId: string, column: DocumentColumn) => {
    const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === column.id;

    // CAS 1: C'est une colonne de type "file". On utilise toujours FileCellPreview.
    if (column.data_type === 'file') {
      const cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);
      const filesForCell = cell ? fileAttachments.filter(f => f.cell_data_id === cell.id) : [];
      return (
        <FileCellPreview
          files={filesForCell}
          onOpenManager={() => handleCellClick(rowId, column)}
        />
      );
    }
    
    // CAS 2: La cellule est en mode édition (et ce n'est pas un fichier).
    if (isEditing) {
        // ... (votre code d'édition existant est correct et vient ici)
        // ... (boolean, select, text, number, date)
        if (column.data_type === 'boolean') {
            return <select value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { saveCell(rowId, column.id, editValue); setEditingCell(null); }} className="w-full h-full" autoFocus><option value="true">Oui</option><option value="false">Non</option></select>;
        } else if (column.data_type === 'select') {
            return <select value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => { saveCell(rowId, column.id, editValue); setEditingCell(null); }} className="w-full h-full" autoFocus><option value="">Sélectionnez...</option>{column.config.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}</select>;
        } else if (column.data_type === 'text') {
            return <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e, rowId, column.id)} onBlur={() => { saveCell(rowId, column.id, editValue); setEditingCell(null); }} className="w-full h-full" autoFocus />;
        } else {
            return <input type={column.data_type === 'number' ? 'number' : 'date'} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e as any, rowId, column.id)} onBlur={() => { saveCell(rowId, column.id, editValue); setEditingCell(null); }} className="w-full h-full" autoFocus />;
        }
    }

    // CAS 3: Affichage normal pour tous les autres types de cellules.
    return (
      <div onClick={() => handleCellClick(rowId, column)} className="w-full h-full p-2 cursor-cell whitespace-pre-wrap break-words">
        {getDisplayValue(rowId, column)}
      </div>
    );
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
      onRowsChange([...rows, data]);
    } catch (error) {
      console.error('Error adding row:', error);
    }
  };

  const deleteRow = async (rowId: string) => {
    try {
      // Supprimer d'abord les données des cellules
      const { error: cellError } = await supabase
        .from('cell_data')
        .delete()
        .eq('row_id', rowId);

      if (cellError) throw cellError;

      // Puis supprimer la ligne
      const { error } = await supabase
        .from('document_rows')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      onRowsChange(rows.filter(row => row.id !== rowId));
      onCellDataChange(cellData.filter(cell => cell.row_id !== rowId));
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const handleFilesChange = (newlyUploadedFiles: FileAttachment[], deletedFileId?: string) => {
    if (deletedFileId) {
      setFileAttachments(prev => prev.filter(f => f.id !== deletedFileId));
    } else {
      setFileAttachments(prev => [...prev, ...newlyUploadedFiles]);
    }
  };

  return (
    <>
      <div className="overflow-auto bg-white dark:bg-gray-900">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 min-w-12 z-10 text-gray-900 dark:text-white">
                #
              </th>
              {sortedColumns.map(column => (
                <th
                  key={column.id}
                  className="border border-gray-300 dark:border-gray-600 p-2 sticky top-0 bg-gray-100 dark:bg-gray-800 z-10"
                  style={{ 
                    width: column.width,
                    backgroundColor: column.background_color,
                    color: column.text_color
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    <span className="text-xs opacity-75 ml-2">
                      {column.data_type}
                    </span>
                  </div>
                </th>
              ))}
              <th className="sticky right-0 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-2 min-w-16 z-10 text-gray-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 group">
                <td className="sticky left-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-2 text-center text-gray-500 dark:text-gray-400 group-hover:bg-gray-50 dark:group-hover:bg-gray-800">
                  {index + 1}
                </td>
                {sortedColumns.map(column => (
                  <td
                    key={`${row.id}-${column.id}`}
                    className="border border-gray-300 dark:border-gray-600 p-0 h-10"
                    style={{ width: column.width }}
                  >
                    {renderCell(row.id, column)}
                  </td>
                ))}
                <td className="sticky right-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 p-0 group-hover:bg-gray-50 dark:group-hover:bg-gray-800">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="w-full h-full flex items-center justify-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                    title="Supprimer la ligne"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            
            {rows.length === 0 && (
              <tr>
                <td 
                  colSpan={columns.length + 2} 
                  className="text-center py-8 text-gray-500 dark:text-gray-400"
                >
                  <div className="flex flex-col items-center space-y-4">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Aucune donnée. Ajoutez votre première ligne pour commencer.</p>
                    <button
                      onClick={addNewRow}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      + Ajouter la première ligne
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Bouton d'ajout de ligne flottant */}
        {rows.length > 0 && (
          <div className="sticky bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <button
              onClick={addNewRow}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>Ajouter une ligne</span>
            </button>
          </div>
        )}
      </div>

      {/* Éditeurs modaux */}
      <MultilineEditor
        cellDataId={multilineEditor.cellDataId}
        parentColumn={multilineEditor.parentColumn}
        isOpen={multilineEditor.isOpen}
        onClose={() => setMultilineEditor({ isOpen: false, cellDataId: '', parentColumn: null! })}
      />

      <FileAttachmentManager
        parentId={fileManager.parentId}
        parentType="cell"
        existingFiles={fileAttachments.filter(f => f.cell_data_id === fileManager.parentId)}
        onFilesChange={handleFilesChange}
        isOpen={fileManager.isOpen}
        onClose={() => setFileManager({ isOpen: false, parentId: '' })}
      />
    </>
  );
}