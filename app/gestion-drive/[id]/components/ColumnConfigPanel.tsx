// app/documents/[id]/components/ColumnConfigPanel.tsx
'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DataType, DocumentColumn } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
// import { useHistory } from './HistoryTracker';

interface ColumnConfigPanelProps {
  documentId: string;
  columns: DocumentColumn[];
  onColumnsChange: (columns: DocumentColumn[]) => void;
}

export default function ColumnConfigPanel({ 
  documentId, 
  columns, 
  onColumnsChange 
}: ColumnConfigPanelProps) {
  const [editingColumn, setEditingColumn] = useState<DocumentColumn | null>(null);
  const { user } = useAuth();

  const addNewColumn = async () => {
    try {
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const newOrderIndex = columns.length > 0 ? Math.max(...columns.map(c => c.order_index)) + 1 : 0;

      const { data, error } = await supabase
        .from('document_columns')
        .insert([
          {
            document_id: documentId,
            label: 'Nouvelle Colonne',
            data_type: 'text',
            order_index: newOrderIndex,
            background_color: '#FFFFFF',
            text_color: '#000000',
            width: 200,
            permissions: { read: ['all'], write: ['all'], delete: ['all'] },
            config: {}
          } as never
        ])
        .select()
        .single();

      if (error) throw error;
      onColumnsChange([...columns, data]);
      setEditingColumn(data);
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  // const { logAction } = useHistory(documentId);


  const updateColumn = async (columnId: string, updates: Partial<DocumentColumn>) => {
    try {
      const { data, error } = await supabase
        .from('document_columns')
        .update(updates as never)
        .eq('id', columnId)
        .select()
        .single();

      if (error) throw error;
      
      onColumnsChange(columns.map(col => 
        col.id === columnId ? data : col
      ));
    } catch (error) {
      console.error('Error updating column:', error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('document_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;
      
      onColumnsChange(columns.filter(col => col.id !== columnId));
      if (editingColumn?.id === columnId) {
        setEditingColumn(null);
      }
    } catch (error) {
      console.error('Error deleting column:', error);
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const reorderedColumns = Array.from(columns);
    const [movedColumn] = reorderedColumns.splice(result.source.index, 1);
    reorderedColumns.splice(result.destination.index, 0, movedColumn);

    // Update order indices
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order_index: index
    }));

    onColumnsChange(updatedColumns);

    // Update in database
    try {
      for (const column of updatedColumns) {
        await supabase
          .from('document_columns')
          .update({ order_index: column.order_index } as never)
          .eq('id', column.id);
      }
    } catch (error) {
      console.error('Error updating column order:', error);
    }
  };

  return (
    <div className="p-4 h-full bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Colonnes</h2>
        <button
          onClick={addNewColumn}
          disabled={!user}
          className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          + Ajouter
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {columns.map((column, index) => (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div 
                          {...provided.dragHandleProps}
                          className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          ≡
                        </div>
                        <span className="flex-1 mx-2 font-medium text-gray-900 dark:text-white">
                          {column.label}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setEditingColumn(
                              editingColumn?.id === column.id ? null : column
                            )}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors"
                          >
                            Éditer
                          </button>
                          <button
                            onClick={() => deleteColumn(column.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {editingColumn?.id === column.id && (
                        <ColumnEditor
                          column={column}
                          onUpdate={(updates) => updateColumn(column.id, updates)}
                          onClose={() => setEditingColumn(null)}
                        />
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {columns.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Aucune colonne configurée</p>
          <p className="text-sm mt-1">Ajoutez votre première colonne</p>
        </div>
      )}
    </div>
  );
}

// Composant d'édition de colonne
function ColumnEditor({ 
  column, 
  onUpdate, 
  onClose 
}: { 
  column: DocumentColumn;
  onUpdate: (updates: Partial<DocumentColumn>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(column);

  const handleSave = () => {
    onUpdate(formData);
    onClose();
  };

  const dataTypes: { value: DataType; label: string }[] = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Oui/Non' },
    { value: 'file', label: 'Fichier' },
    { value: 'multiline', label: 'Multiligne' },
    { value: 'select', label: 'Liste déroulante' }
  ];

  return (
    <div className="mt-3 p-3 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 space-y-3">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Label
        </label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Type de données */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Type
        </label>
        <select
          value={formData.data_type}
          onChange={(e) => setFormData({ ...formData, data_type: e.target.value as DataType })}
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {dataTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Largeur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Largeur (px)
        </label>
        <input
          type="number"
          value={formData.width}
          onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 200 })}
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="100"
          max="500"
        />
      </div>

      {/* Couleurs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fond
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={formData.background_color}
              onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              className="w-full h-8 border border-gray-300 dark:border-gray-500 rounded cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formData.background_color}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Texte
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={formData.text_color}
              onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
              className="w-full h-8 border border-gray-300 dark:border-gray-500 rounded cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formData.text_color}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}