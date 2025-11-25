// app/documents/[id]/components/ColumnConfigPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DataType, DocumentColumn } from '@/app/types/documents';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const { user } = useAuth();

  const addNewColumn = async (): Promise<void> => {
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
          }
        ])
        .select()
        .single();

      if (error) throw error;
      onColumnsChange([...columns, data as DocumentColumn]);
      setEditingColumn(data as DocumentColumn);
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  const updateColumn = async (columnId: string, updates: Partial<DocumentColumn>): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('document_columns')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', columnId)
        .select()
        .single();

      if (error) throw error;
      
      onColumnsChange(columns.map(col => 
        col.id === columnId ? data as DocumentColumn : col
      ));
    } catch (error) {
      console.error('Error updating column:', error);
    }
  };

  const deleteColumn = async (columnId: string): Promise<void> => {
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

  const onDragEnd = async (result: DropResult): Promise<void> => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    setIsReordering(true);

    // 1. Calcul du nouvel ordre localement
    const reorderedColumns = Array.from(columns);
    const [movedColumn] = reorderedColumns.splice(result.source.index, 1);
    reorderedColumns.splice(result.destination.index, 0, movedColumn);

    // Réassignation des index (0, 1, 2...)
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order_index: index
    }));

    // Mise à jour optimiste de l'UI
    onColumnsChange(updatedColumns);

    try {
      const updatePromises = updatedColumns.map((column) =>
        supabase
          .from('document_columns')
          .update({ order_index: column.order_index })
          .eq('id', column.id)
          .select('id, label, order_index') // On demande le retour pour confirmer
      );

      const results = await Promise.all(updatePromises);
      
      // Vérification des erreurs dans les promesses
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('❌ [DB] Erreurs lors de la mise à jour :', errors);
        throw new Error('Erreur lors de la sauvegarde de l\'ordre');
      }

      console.log('✅ [DB] Mise à jour terminée avec succès.');

      // 3. VERIFICATION ULTIME : On relit la base de données
      // C'est ce bloc qui te dira si la BDD a vraiment changé
      const { data: verifyData, error: verifyError } = await supabase
        .from('document_columns')
        .select('label, order_index')
        .eq('document_id', documentId)
        .order('order_index', { ascending: true });
    } catch (error) {
      console.error('💥 [CRASH] Erreur critique :', error);
      // En cas d'erreur, on remet l'ancien état pour éviter la désynchronisation
      onColumnsChange(columns);
      alert("Erreur lors de la sauvegarde de l'ordre des colonnes");
    } finally {
      setIsReordering(false);
    }
  };

  // Trier les colonnes par order_index pour l'affichage
  const sortedColumns = [...columns].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="p-4 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Configuration des Colonnes
          {isReordering && (
            <span className="ml-2 text-xs text-blue-600 animate-pulse">
              Sauvegarde...
            </span>
          )}
        </h2>
        <button
          onClick={addNewColumn}
          disabled={!user}
          className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
        >
          <span>+</span>
          <span>Ajouter</span>
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto"
            >
              {sortedColumns.map((column, index) => (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border transition-all duration-200
                        ${snapshot.isDragging 
                          ? 'border-blue-500 shadow-lg bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-600'
                        }
                        ${editingColumn?.id === column.id ? 'ring-2 ring-blue-500' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div 
                          {...provided.dragHandleProps}
                          className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          title="Glisser pour réorganiser"
                        >
                          ≡
                        </div>
                        <span className="flex-1 mx-2 font-medium text-gray-900 dark:text-white truncate">
                          {column.label}
                        </span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                            {getDataTypeLabel(column.data_type)}
                          </span>
                          <span className="text-gray-400">#{column.order_index + 1}</span>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => setEditingColumn(
                              editingColumn?.id === column.id ? null : column
                            )}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors p-1"
                            title="Éditer la colonne"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteColumn(column.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm transition-colors p-1"
                            title="Supprimer la colonne"
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
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
            📊
          </div>
          <p className="font-medium">Aucune colonne configurée</p>
          <p className="text-sm mt-1">Ajoutez votre première colonne pour commencer</p>
        </div>
      )}
    </div>
  );
}

// Helper function pour les labels des types
function getDataTypeLabel(dataType: DataType): string {
  const labels: Record<DataType, string> = {
    text: 'Texte',
    number: 'Nombre',
    date: 'Date',
    boolean: 'Oui/Non',
    file: 'Fichier',
    multiline: 'Multiligne',
    select: 'Liste'
  };
  return labels[dataType] || dataType;
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
  const [formData, setFormData] = useState<DocumentColumn>(column);
  const [newOption, setNewOption] = useState<string>('');

  const dataTypes: { value: DataType; label: string }[] = [
    { value: 'text', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Oui/Non' },
    { value: 'file', label: 'Fichier' },
    { value: 'multiline', label: 'Multiligne' },
    { value: 'select', label: 'Liste déroulante' }
  ];

  const handleSave = (): void => {
    onUpdate(formData);
    onClose();
  };

  const handleAddOption = (): void => {
    if (!newOption.trim()) return;

    const updatedOptions = [...(formData.config.options || []), newOption.trim()];
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        options: updatedOptions
      }
    });
    setNewOption('');
  };

  const handleRemoveOption = (index: number): void => {
    const updatedOptions = formData.config.options?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        options: updatedOptions
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  // Réinitialiser les options si le type change de "select"
  useEffect(() => {
    if (formData.data_type !== 'select' && formData.config.options) {
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          options: undefined
        }
      });
    }
  }, [formData.data_type]);

  return (
    <div className="mt-3 p-4 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 space-y-4">
      <h4 className="font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-500 pb-2">
        Édition de la colonne
      </h4>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nom de la colonne *
        </label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Saisissez le nom de la colonne"
        />
      </div>

      {/* Type de données */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Type de données *
        </label>
        <select
          value={formData.data_type}
          onChange={(e) => setFormData({ ...formData, data_type: e.target.value as DataType })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {dataTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Options pour les listes déroulantes */}
      {formData.data_type === 'select' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Options de la liste déroulante
          </label>
          
          {/* Ajout d'une nouvelle option */}
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Saisissez une nouvelle option"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddOption}
              disabled={!newOption.trim()}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ajouter
            </button>
          </div>

          {/* Liste des options existantes */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {formData.config.options?.map((option, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border">
                <span className="text-sm text-gray-900 dark:text-white">{option}</span>
                <button
                  onClick={() => handleRemoveOption(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm transition-colors"
                  title="Supprimer cette option"
                >
                  ×
                </button>
              </div>
            ))}
            
            {(!formData.config.options || formData.config.options.length === 0) && (
              <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-sm">
                Aucune option définie. Ajoutez des options pour la liste déroulante.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Largeur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Largeur (px)
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            value={formData.width}
            onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) })}
            className="flex-1"
            min="1"
            max="500"
            step="10"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-12 text-right">
            {formData.width}px
          </span>
        </div>
      </div>

      {/* Couleurs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Couleur de fond
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={formData.background_color}
              onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              className="w-12 h-8 border border-gray-300 dark:border-gray-500 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.background_color}
              onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="#FFFFFF"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Couleur du texte
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={formData.text_color}
              onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
              className="w-12 h-8 border border-gray-300 dark:border-gray-500 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.text_color}
              onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-500 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>

      {/* Aperçu */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-500">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Aperçu
        </label>
        <div 
          className="p-3 rounded border text-sm"
          style={{
            backgroundColor: formData.background_color,
            color: formData.text_color,
            width: `${formData.width}px`
          }}
        >
          {formData.label || 'Aperçu'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-500">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}