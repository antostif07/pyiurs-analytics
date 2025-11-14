// app/documents/[id]/components/MultilineEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SubColumn, MultilineData, DocumentColumn } from '@/app/types/documents';

interface MultilineEditorProps {
  cellDataId: string;
  parentColumn: DocumentColumn;
  isOpen: boolean;
  onClose: () => void;
}

export default function MultilineEditor({ 
  cellDataId, 
  parentColumn, 
  isOpen, 
  onClose 
}: MultilineEditorProps) {
  const [subColumns, setSubColumns] = useState<SubColumn[]>([]);
  const [multilineData, setMultilineData] = useState<MultilineData[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; subColumnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && cellDataId) {
      fetchMultilineData();
    }
  }, [isOpen, cellDataId]);

  const fetchMultilineData = async () => {
    try {
      setLoading(true);

      // Fetch sub-columns
      const { data: subColsData, error: subColsError } = await supabase
        .from('sub_columns')
        .select('*')
        .eq('parent_column_id', parentColumn.id)
        .order('order_index');

      if (subColsError) throw subColsError;
      setSubColumns(subColsData || []);

      // Fetch multiline data
      const { data: multiData, error: multiError } = await supabase
        .from('multiline_data')
        .select('*')
        .eq('cell_data_id', cellDataId)
        .order('order_index');

      if (multiError) throw multiError;
      setMultilineData(multiData || []);

    } catch (error) {
      console.error('Error fetching multiline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewSubColumn = async () => {
    try {
      if (!user) throw new Error('Not authenticated');

      const newOrderIndex = subColumns.length > 0 ? Math.max(...subColumns.map(sc => sc.order_index)) + 1 : 0;

      const { data, error } = await supabase
        .from('sub_columns')
        .insert([
          {
            parent_column_id: parentColumn.id,
            label: 'Nouvelle Colonne',
            data_type: 'text',
            order_index: newOrderIndex,
            width: 150,
            permissions: { read: ['all'], write: ['all'] },
            config: {}
          } as never
        ])
        .select()
        .single();

      if (error) throw error;
      setSubColumns([...subColumns, data]);
    } catch (error) {
      console.error('Error adding sub-column:', error);
    }
  };

  const updateSubColumn = async (subColumnId: string, updates: Partial<SubColumn>) => {
    try {
      const { data, error } = await supabase
        .from('sub_columns')
        .update(updates as never)
        .eq('id', subColumnId)
        .select()
        .single();

      if (error) throw error;
      setSubColumns(subColumns.map(sc => sc.id === subColumnId ? data : sc));
    } catch (error) {
      console.error('Error updating sub-column:', error);
    }
  };

  const deleteSubColumn = async (subColumnId: string) => {
    try {
      const { error } = await supabase
        .from('sub_columns')
        .delete()
        .eq('id', subColumnId);

      if (error) throw error;
      setSubColumns(subColumns.filter(sc => sc.id !== subColumnId));
      
      // Supprimer aussi les données associées
      const { error: dataError } = await supabase
        .from('multiline_data')
        .delete()
        .eq('sub_column_id', subColumnId);

      if (dataError) throw dataError;
      setMultilineData(multilineData.filter(md => md.sub_column_id !== subColumnId));
    } catch (error) {
      console.error('Error deleting sub-column:', error);
    }
  };

  const addNewRow = async () => {
    try {
      if (!user) throw new Error('Not authenticated');

      const newOrderIndex = multilineData.length > 0 
        ? Math.max(...multilineData.map(md => md.order_index)) + 1 
        : 0;

      // Create empty data for each sub-column
      const newData = await Promise.all(
        subColumns.map(async (subCol) => {
          const { data, error } = await supabase
            .from('multiline_data')
            .insert([
              {
                cell_data_id: cellDataId,
                sub_column_id: subCol.id,
                order_index: newOrderIndex,
                value_type: subCol.data_type
              } as never
            ])
            .select()
            .single();

          if (error) throw error;
          return data;
        })
      );

      setMultilineData(prev => [...prev, ...newData]);
    } catch (error) {
      console.error('Error adding multiline row:', error);
    }
  };

  const saveMultilineCell = async (multilineDataId: string, subColumnId: string, value: string) => {
    try {
      const subColumn = subColumns.find(sc => sc.id === subColumnId);
      if (!subColumn) return;

      let updateData: any = { value_type: subColumn.data_type };

      switch (subColumn.data_type) {
        case 'number':
          updateData.number_value = value ? parseFloat(value) : null;
          break;
        case 'date':
          updateData.date_value = value ? new Date(value).toISOString() : null;
          break;
        case 'boolean':
          updateData.boolean_value = value === 'true' || value === 'Oui';
          break;
        default:
          updateData.text_value = value;
      }

      const { data, error } = await supabase
        .from('multiline_data')
        .update(updateData as never)
        .eq('id', multilineDataId)
        .select()
        .single();

      if (error) throw error;

      setMultilineData(prev => 
        prev.map(item => item.id === multilineDataId ? data : item)
      );
    } catch (error) {
      console.error('Error saving multiline cell:', error);
    }
  };

  const deleteRow = async (orderIndex: number) => {
    try {
      const { error } = await supabase
        .from('multiline_data')
        .delete()
        .eq('cell_data_id', cellDataId)
        .eq('order_index', orderIndex);

      if (error) throw error;

      setMultilineData(prev => 
        prev.filter(md => md.order_index !== orderIndex)
      );
    } catch (error) {
      console.error('Error deleting multiline row:', error);
    }
  };

  const getMultilineValue = (orderIndex: number, subColumnId: string) => {
    const data = multilineData.find(
      md => md.order_index === orderIndex && md.sub_column_id === subColumnId
    );
    if (!data) return '';

    switch (data.value_type) {
      case 'text': return data.text_value || '';
      case 'number': return data.number_value?.toString() || '';
      case 'date': return data.date_value ? new Date(data.date_value).toLocaleDateString() : '';
      case 'boolean': return data.boolean_value ? 'Oui' : 'Non';
      default: return '';
    }
  };

  const startEditing = (orderIndex: number, subColumnId: string) => {
    setEditingCell({ rowIndex: orderIndex, subColumnId });
    setEditValue(getMultilineValue(orderIndex, subColumnId));
  };

  const handleKeyDown = (e: React.KeyboardEvent, multilineDataId: string, subColumnId: string) => {
    if (e.key === 'Enter') {
      saveMultilineCell(multilineDataId, subColumnId, editValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  if (!isOpen) return null;

  // Get unique row indices
  const rowIndices = Array.from(new Set(multilineData.map(md => md.order_index))).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Éditer {parentColumn.label}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rowIndices.length} ligne(s) • {subColumns.length} colonne(s)
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={addNewSubColumn}
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <span>+</span>
              <span>Colonne</span>
            </button>
            <button
              onClick={addNewRow}
              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
            >
              <span>+</span>
              <span>Ligne</span>
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Table */}
              <div className="overflow-auto max-h-[calc(100vh-300px)]">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="border border-gray-200 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white min-w-12">
                        #
                      </th>
                      {subColumns.map(subCol => (
                        <th 
                          key={subCol.id}
                          className="border border-gray-200 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white relative group"
                          style={{ width: subCol.width }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{subCol.label}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ({subCol.data_type})
                            </span>
                          </div>
                          
                          {/* Menu actions sous-colonne */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <button
                              onClick={() => {
                                const newLabel = prompt('Nouveau nom:', subCol.label);
                                if (newLabel) {
                                  updateSubColumn(subCol.id, { label: newLabel });
                                }
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-white dark:bg-gray-600 rounded text-xs"
                              title="Renommer"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteSubColumn(subCol.id)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-gray-600 rounded text-xs"
                              title="Supprimer"
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}
                      <th className="border border-gray-200 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white min-w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowIndices.map(orderIndex => (
                      <tr key={orderIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="border border-gray-200 dark:border-gray-600 p-2 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
                          {orderIndex + 1}
                        </td>
                        {subColumns.map(subCol => {
                          const cellData = multilineData.find(
                            md => md.order_index === orderIndex && md.sub_column_id === subCol.id
                          );
                          const isEditing = editingCell?.rowIndex === orderIndex && 
                                          editingCell?.subColumnId === subCol.id;

                          return (
                            <td 
                              key={subCol.id}
                              className="border border-gray-200 dark:border-gray-600 p-0 h-10 bg-white dark:bg-gray-900"
                            >
                              {isEditing ? (
                                <input
                                  type={subCol.data_type === 'number' ? 'number' : 
                                        subCol.data_type === 'date' ? 'date' : 'text'}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => {
                                    if (cellData) {
                                      saveMultilineCell(cellData.id, subCol.id, editValue);
                                    }
                                    setEditingCell(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && cellData) {
                                      saveMultilineCell(cellData.id, subCol.id, editValue);
                                      setEditingCell(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                  className="w-full h-full px-2 py-1 border border-blue-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => startEditing(orderIndex, subCol.id)}
                                  className="w-full h-full px-2 py-1 cursor-cell hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {getMultilineValue(orderIndex, subCol.id) || (
                                    <span className="text-gray-400 dark:text-gray-500 text-sm">
                                      Cliquer pour éditer
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-gray-200 dark:border-gray-600 p-0 bg-white dark:bg-gray-900">
                          <button
                            onClick={() => deleteRow(orderIndex)}
                            className="w-full h-full flex items-center justify-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                            title="Supprimer la ligne"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {rowIndices.length === 0 && (
                      <tr>
                        <td 
                          colSpan={subColumns.length + 2} 
                          className="text-center py-8 text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex flex-col items-center space-y-4">
                            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>Aucune donnée multiligne</p>
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
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div>
              Double-cliquez sur une cellule pour éditer
            </div>
            <div>
              {rowIndices.length} ligne(s) • {subColumns.length} colonne(s)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}