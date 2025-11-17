// app/documents/[id]/components/DataGrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MultilineEditor from './MultilineEditor';
import FileUploader from './FileUploader';
import { CellData, DocumentColumn, DocumentRow, FileAttachment, MultilineData } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
// import { useHistory } from './HistoryTracker';

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

  const [fileUploader, setFileUploader] = useState<{
    isOpen: boolean;
    cellDataId: string;
    columnId: string;
  }>({ isOpen: false, cellDataId: '', columnId: '' });

  const { user } = useAuth();

  useEffect(() => {
    fetchAdditionalData();
  }, [cellData]);

  const fetchAdditionalData = async () => {
    try {
      // Fetch file attachments for file columns
      const fileColumns = columns.filter(col => col.data_type === 'file');
      if (fileColumns.length > 0 && cellData.length > 0) {
        const { data: filesData, error: filesError } = await supabase
          .from('file_attachments')
          .select('*')
          .in('cell_data_id', cellData.map(cell => cell.id));

        if (filesError) throw filesError;
        setFileAttachments(filesData || []);
      }

      // Fetch multiline data for multiline columns
      const multilineColumns = columns.filter(col => col.data_type === 'multiline');
      if (multilineColumns.length > 0 && cellData.length > 0) {
        const { data: multiData, error: multiError } = await supabase
          .from('multiline_data')
          .select('*')
          .in('cell_data_id', cellData.map(cell => cell.id));

        if (multiError) throw multiError;
        setMultilineData(multiData || []);
      }
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const getCellValue = (rowId: string, columnId: string) => {
    const cell = cellData.find(c => c.row_id === rowId && c.column_id === columnId);
    if (!cell) return '';

    const column = columns.find(c => c.id === columnId);
    
    switch (cell.value_type) {
      case 'text': 
        return cell.text_value || '';
      case 'number': 
        return cell.number_value?.toString() || '';
      case 'date': 
        return cell.date_value ? new Date(cell.date_value).toLocaleDateString('fr-FR') : '';
      case 'boolean': 
        return cell.boolean_value ? 'Oui' : 'Non';
      case 'select':
        // 🔥 CORRECTION : Pour les selects, utiliser text_value
        return cell.text_value || '';
      default: 
        return cell.text_value || '';
    }
  };

  const startEditing = (rowId: string, columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.data_type === 'multiline' || column?.data_type === 'file') {
      return; // Ne pas ouvrir l'édition directe pour ces types
    }

    const currentValue = getCellValue(rowId, columnId);
    
    // 🔥 CORRECTION : Pour les boolean, convertir en string 'true'/'false'
    if (column?.data_type === 'boolean') {
      setEditValue(currentValue === 'Oui' ? 'true' : 'false');
    } else {
      setEditValue(currentValue);
    }
    
    setEditingCell({ rowId, columnId });
  };

  // const { logAction } = useHistory(documentId);

  const saveCell = async (rowId: string, columnId: string, value: string) => {
    try {
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const column = columns.find(c => c.id === columnId);
      if (!column) return;

      const existingCell = cellData.find(c => c.row_id === rowId && c.column_id === columnId);

      let updateData: any = {
        value_type: column.data_type,
        updated_by: user.id,
        // 🔥 CORRECTION : Réinitialiser toutes les valeurs pour éviter les conflits
        text_value: null,
        number_value: null,
        date_value: null,
        boolean_value: null
      };

      // Set value based on data type
      switch (column.data_type) {
        case 'number':
          updateData.number_value = value ? parseFloat(value) : null;
          break;
        case 'date':
          updateData.date_value = value ? new Date(value).toISOString() : null;
          break;
        case 'boolean':
          updateData.boolean_value = value === 'true' || value === 'Oui';
          break;
        case 'select':
          // 🔥 CORRECTION : Pour les selects, sauvegarder comme text_value
          updateData.text_value = value;
          break;
        default:
          updateData.text_value = value;
      }

      if (existingCell) {
        console.log('💾 Mise à jour cellule existante:', { rowId, columnId, value, updateData });

        // Update existing cell
        const { data, error } = await supabase
          .from('cell_data')
          .update(updateData)
          .eq('id', existingCell.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw error;
        }
        
        console.log('✅ Cellule mise à jour:', data);
        onCellDataChange(cellData.map(cell => 
          cell.id === existingCell.id ? data : cell
        ));
      } else {
        console.log('💾 Création nouvelle cellule:', { rowId, columnId, value, updateData });

        // Create new cell
        const { data: newCellData, error } = await supabase
          .from('cell_data')
          .insert([
            {
              row_id: rowId,
              column_id: columnId,
              created_by: user.id,
              ...updateData
            }
          ])
          .select()
          .single();

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw error;
        }

        console.log('✅ Nouvelle cellule créée:', newCellData);
        onCellDataChange([...cellData, newCellData]);
      }
    } catch (error) {
      console.error('Error saving cell:', error);
      alert('Erreur lors de la sauvegarde de la cellule');
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
    console.log("🖱️ Clic sur cellule:", { rowId, columnId: column.id, columnType: column.data_type });

    // Vérification de base
    if (!user) {
      console.error("❌ Utilisateur non authentifié");
      return;
    }

    // Chercher la cellule existante
    let cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);
    
    // Si la cellule n'existe pas, on la crée pour les types spéciaux
    if (!cell && (column.data_type === 'multiline' || column.data_type === 'file')) {
      try {
        console.log("📝 Création d'une nouvelle cellule pour type spécial:", column.data_type);
        
        const { data: newCell, error } = await supabase
          .from('cell_data')
          .insert([
            {
              row_id: rowId,
              column_id: column.id,
              value_type: column.data_type,
              created_by: user.id,
              updated_by: user.id,
              // Valeurs par défaut selon le type
              text_value: column.data_type === 'multiline' ? '' : null,
              number_value: null,
              date_value: null,
              boolean_value: null
            }
          ])
          .select()
          .single();

        if (error) {
          console.error("❌ Erreur création cellule:", error);
          alert("Erreur lors de la création de la cellule");
          return;
        }

        console.log("✅ Nouvelle cellule créée avec ID:", newCell.id);
        
        // Mettre à jour immédiatement l'état local
        onCellDataChange([...cellData, newCell]);
        cell = newCell;

      } catch (error) {
        console.error("💥 Erreur critique création cellule:", error);
        return;
      }
    }

    // Gestion selon le type de colonne
    if (column.data_type === 'multiline') {
      if (!cell) {
        console.error("❌ Cellule non trouvée pour éditeur multiligne");
        return;
      }
      setMultilineEditor({
        isOpen: true,
        cellDataId: cell.id,
        parentColumn: column
      });
    } else if (column.data_type === 'file') {
      if (!cell) {
        console.error("❌ Cellule non trouvée pour upload de fichiers");
        return;
      }
      setFileUploader({
        isOpen: true,
        cellDataId: cell.id,
        columnId: column.id
      });
    } else {
      // Pour les types simples, on peut éditer directement
      startEditing(rowId, column.id);
    }
  };

  const getDisplayValue = (rowId: string, column: DocumentColumn) => {
    const cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);

    if (column.data_type === 'multiline') {
      const multilineCount = cell ? multilineData.filter(md => md.cell_data_id === cell.id).length : 0;
      return multilineCount > 0 ? `${multilineCount} ligne(s)` : '';
    } else if (column.data_type === 'file') {
      const fileCount = cell ? fileAttachments.filter(f => f.cell_data_id === cell.id).length : 0;
      return fileCount > 0 ? `${fileCount} fichier(s)` : '';
    } else if (column.data_type === 'text' && cell?.text_value) {
      // 🔥 Afficher les retours à ligne pour le texte
      return cell.text_value;
    }
    
    // Pour les autres types, si la cellule n'existe pas, afficher un placeholder
    return cell ? getCellValue(rowId, column.id) : '';
  };

  const renderCell = (rowId: string, column: DocumentColumn) => {
  const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === column.id;
  const displayValue = getDisplayValue(rowId, column);
  const cell = cellData.find(c => c.row_id === rowId && c.column_id === column.id);

  // Édition pour les types spéciaux
  if (isEditing) {
    if (column.data_type === 'boolean') {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            saveCell(rowId, column.id, editValue);
            setEditingCell(null);
          }}
          className="w-full h-full px-2 py-1 border border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          autoFocus
        >
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
      );
    } else if (column.data_type === 'select') {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            saveCell(rowId, column.id, editValue);
            setEditingCell(null);
          }}
          className="w-full h-full px-2 py-1 border border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          autoFocus
        >
          <option value="">Sélectionnez...</option>
          {column.config.options?.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else {
      if (column.data_type === 'text') {
    return (
      <textarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            // Ctrl+Enter pour sauvegarder
            saveCell(rowId, column.id, editValue);
            setEditingCell(null);
          } else if (e.key === 'Escape') {
            setEditingCell(null);
          }
        }}
        onBlur={() => {
          console.log('💾 Sauvegarde texte:', { rowId, columnId: column.id, value: editValue });
          saveCell(rowId, column.id, editValue);
          setEditingCell(null);
        }}
        className="w-full h-full px-2 py-1 border border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y min-h-[80px]"
        autoFocus
        rows={3}
      />
    );
  } else {
    return (
      <input
        type={column.data_type === 'number' ? 'number' : 'date'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, rowId, column.id)}
        onBlur={() => {
          console.log('💾 Sauvegarde standard:', { rowId, columnId: column.id, value: editValue });
          saveCell(rowId, column.id, editValue);
          setEditingCell(null);
        }}
        className="w-full h-full px-2 py-1 border border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        autoFocus
      />
    );
  }
    }
  }

  // Affichage selon le type de colonne
  let cellContent = displayValue;
  let cellClassName = "w-full h-full px-2 py-1 cursor-cell hover:bg-gray-50 dark:hover:bg-gray-700";

  if (column.data_type === 'multiline' || column.data_type === 'file') {
    cellClassName += " text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium";
  }

  if (column.data_type === 'boolean') {
    cellContent = displayValue === 'true' || displayValue === 'Oui' ? '✅ Oui' : '❌ Non';
  }

  return (
  <div
    onClick={() => handleCellClick(rowId, column)}
    className={cellClassName}
    style={{
      backgroundColor: column.background_color,
      color: column.text_color
    }}
  >
    {/* 🔥 Afficher les retours à ligne pour le texte */}
    {column.data_type === 'text' && displayValue ? (
      <div className="whitespace-pre-wrap break-words">
        {displayValue}
      </div>
    ) : (
      cellContent
    )}
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

  const handleFilesChange = (newFiles: FileAttachment[]) => {
    setFileAttachments(prev => {
      const updated = [...prev, ...newFiles];
      // Rafraîchir les données
      fetchAdditionalData();
      return updated;
    });
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
              {columns.map(column => (
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
                {columns.map(column => (
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

      <FileUploader
        cellDataId={fileUploader.cellDataId}
        columnId={fileUploader.columnId}
        existingFiles={fileAttachments.filter(f => f.cell_data_id === fileUploader.cellDataId)}
        onFilesChange={handleFilesChange}
        isOpen={fileUploader.isOpen}
        onClose={() => setFileUploader({ isOpen: false, cellDataId: '', columnId: '' })}
      />
    </>
  );
}