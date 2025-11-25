'use client';

import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { 
  SubColumn, 
  MultilineData, 
  DocumentColumn, 
  DataType,
  FileAttachment // Assurez-vous que cette interface est mise à jour
} from '@/app/types/documents';
import FileAttachmentManager from './FileAttachmentManager';
import FileCellPreview from './FileCellPreview';

// --- INTERFACES LOCALES ---

interface MultilineEditorProps {
  cellDataId: string;
  parentColumn: DocumentColumn;
  isOpen: boolean;
  onClose: () => void;
}

interface EditingCellState {
  rowIndex: number;
  subColumnId: string;
}

// --- COMPOSANT PRINCIPAL ---

export default function MultilineEditor({ 
  cellDataId, 
  parentColumn, 
  isOpen, 
  onClose 
}: MultilineEditorProps) {
  
  const [subColumns, setSubColumns] = useState<SubColumn[]>([]);
  const [multilineData, setMultilineData] = useState<MultilineData[]>([]);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [editingSubColumn, setEditingSubColumn] = useState<SubColumn | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [fileManager, setFileManager] = useState<{
    isOpen: boolean;
    parentId: string; // ID de la multiline_data
  }>({ isOpen: false, parentId: '' });
  
  const { user } = useAuth();
  const params = useParams();
  const documentId = params.id as string;

  useEffect(() => {
    if (isOpen && cellDataId) {
      fetchMultilineData();
    }
  }, [isOpen, cellDataId]);

  const fetchMultilineData = async () => {
    if (!cellDataId || !parentColumn?.id) return;
    try {
      setLoading(true);
      
      const { data: subColsData, error: subColsError } = await supabase
        .from('sub_columns')
        .select('*')
        .eq('parent_column_id', parentColumn.id)
        .order('order_index');
      if (subColsError) throw subColsError;
      setSubColumns(subColsData || []);

      const { data: multiData, error: multiError } = await supabase
        .from('multiline_data')
        .select('*')
        .eq('cell_data_id', cellDataId)
        .order('order_index');
      if (multiError) throw multiError;
      setMultilineData(multiData || []);

      if (multiData && multiData.length > 0) {
        const multiDataIds = multiData.map(md => md.id);
        const { data: attachments, error: attachError } = await supabase
          .from('file_attachments')
          .select('*')
          .in('multiline_data_id', multiDataIds);
        if (attachError) throw attachError;
        setFileAttachments(attachments || []);
      } else {
        setFileAttachments([]);
      }

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
        .insert([{
          parent_column_id: parentColumn.id,
          label: 'Nouvelle Colonne',
          data_type: 'text' as DataType,
          order_index: newOrderIndex,
          width: 150,
          permissions: { read: ['all'], write: ['all'] }, 
          config: {} 
        }])
        .select()
        .single();
      if (error) throw error;
      setSubColumns([...subColumns, data as SubColumn]);
      setEditingSubColumn(data as SubColumn);
    } catch (error) {
      console.error('Error adding sub-column:', error);
    }
  };

  const updateSubColumn = async (subColumnId: string, updates: Partial<SubColumn>) => {
    try {
      const { data, error } = await supabase
        .from('sub_columns')
        .update(updates as any)
        .eq('id', subColumnId)
        .select()
        .single();
      if (error) throw error;
      setSubColumns(subColumns.map(sc => sc.id === subColumnId ? (data as SubColumn) : sc));
      setEditingSubColumn(null);
    } catch (error) {
      console.error('Error updating sub-column:', error);
    }
  };

  const deleteSubColumn = async (subColumnId: string) => {
    if(!confirm("Supprimer cette colonne et toutes ses données ? Cette action est irréversible.")) return;
    try {
      const { error } = await supabase.from('sub_columns').delete().eq('id', subColumnId);
      if (error) throw error;
      setSubColumns(subColumns.filter(sc => sc.id !== subColumnId));
      // Les données de multiline_data et file_attachments seront supprimées en cascade par la DB.
      fetchMultilineData(); // Re-fetch pour rafraîchir
    } catch (error) {
      console.error('Error deleting sub-column:', error);
    }
  };

  const addNewRow = async () => {
    try {
      if (!user) throw new Error('Not authenticated');
      const rowIndices = multilineData.map(md => md.order_index);
      const newOrderIndex = rowIndices.length > 0 ? Math.max(...rowIndices) + 1 : 0;

      const newCellsData = subColumns.map(subCol => ({
        cell_data_id: cellDataId,
        sub_column_id: subCol.id,
        order_index: newOrderIndex,
        value_type: subCol.data_type,
      }));

      if(newCellsData.length > 0) {
        const { data, error } = await supabase
          .from('multiline_data')
          .insert(newCellsData)
          .select();
        if (error) throw error;
        setMultilineData(prev => [...prev, ...data]);
      }
    } catch (error) {
      console.error('Error adding multiline row:', error);
    }
  };

  const saveMultilineCell = async (multilineDataId: string, subColumnId: string, value: string) => {
    try {
      const subColumn = subColumns.find(sc => sc.id === subColumnId);
      if (!subColumn || subColumn.data_type === 'file') return;

      const updateData: Partial<MultilineData> = { 
        value_type: subColumn.data_type,
        text_value: undefined, number_value: undefined, date_value: undefined, boolean_value: undefined
      };

      switch (subColumn.data_type) {
        case 'number': updateData.number_value = value ? parseFloat(value) : undefined; break;
        case 'date': updateData.date_value = value ? new Date(value).toISOString() : undefined; break;
        case 'boolean': updateData.boolean_value = value === 'true' || value === 'Oui'; break;
        default: updateData.text_value = value;
      }

      const { data, error } = await supabase
        .from('multiline_data')
        .update(updateData as any)
        .eq('id', multilineDataId)
        .select()
        .single();
      if (error) throw error;
      setMultilineData(prev => prev.map(item => item.id === multilineDataId ? (data as MultilineData) : item));
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
      // Re-fetch to get consistent state after cascade delete
      fetchMultilineData();
    } catch (error) {
      console.error('Error deleting multiline row:', error);
    }
  };

  const getMultilineValue = (orderIndex: number, subColumnId: string): string => {
    const data = multilineData.find(md => md.order_index === orderIndex && md.sub_column_id === subColumnId);
    if (!data) return '';
    
    switch (data.value_type) {
      case 'text': case 'select': return data.text_value || '';
      case 'number': return data.number_value?.toString() || '';
      case 'date': return data.date_value ? new Date(data.date_value).toLocaleDateString('fr-FR') : '';
      case 'boolean': return data.boolean_value ? 'true' : 'false';
      default: return '';
    }
  };

  const startEditing = (orderIndex: number, subColumnId: string, type: DataType) => {
    if (type === 'file') return; 
    setEditingCell({ rowIndex: orderIndex, subColumnId });
    setEditValue(getMultilineValue(orderIndex, subColumnId));
  };
  
  const handleFilesChange = (newlyUploadedFiles: FileAttachment[], deletedFileId?: string) => {
    if (deletedFileId) {
      setFileAttachments(prev => prev.filter(f => f.id !== deletedFileId));
    } else {
      setFileAttachments(prev => [...prev, ...newlyUploadedFiles]);
    }
  };

  if (!isOpen) return null;
  const rowIndices = Array.from(new Set(multilineData.map(md => md.order_index))).sort((a,b) => a - b);

  function MultilineFileCell({ multilineDataId }: { multilineDataId: string }) {
    const filesForThisCell = fileAttachments.filter(f => f.multiline_data_id === multilineDataId);
    const fileCount = filesForThisCell.length;

    console.log(multilineData);
    
    return (
      <div
        onClick={() => setFileManager({ isOpen: true, parentId: multilineDataId })}
        className="w-full h-full min-h-[40px] px-2 py-1 cursor-pointer flex items-center justify-center text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 dark:text-blue-400 transition-colors"
      >
        {fileCount > 0 ? `📎 ${fileCount} fichier(s)` : '☁️ Ajouter'}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 h-5/6 flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Éditer {parentColumn?.label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{rowIndices.length} ligne(s) • {subColumns.length} colonne(s)</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={addNewSubColumn} className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">+ Colonne</button>
            <button onClick={addNewRow} className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">+ Ligne</button>
            <button onClick={onClose} className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700">Fermer</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-auto max-h-[calc(100vh-300px)]">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="border border-gray-200 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 min-w-12 text-gray-900 dark:text-white">#</th>
                      {subColumns.map(subCol => (
                        <th key={subCol.id} className="border border-gray-200 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white relative group min-w-[150px]" style={{ width: subCol.width }}>
                          <div className="flex items-center justify-between">
                            <span className="truncate">{subCol.label}</span>
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded ml-2">{subCol.data_type}</span>
                          </div>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded shadow-sm">
                            <button onClick={() => setEditingSubColumn(subCol)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Configurer">⚙️</button>
                            <button onClick={() => deleteSubColumn(subCol.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer">×</button>
                          </div>
                        </th>
                      ))}
                      <th className="border border-gray-200 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 w-16 text-gray-900 dark:text-white">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowIndices.map((orderIndex, visualIndex) => (
                      <tr key={orderIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="border border-gray-200 dark:border-gray-600 p-2 text-center text-gray-500 bg-white dark:bg-gray-900">{visualIndex + 1}</td>
                        {subColumns.map(subCol => {
                          const cellData = multilineData.find(md => md.order_index === orderIndex && md.sub_column_id === subCol.id);
                          if (!cellData) return <td key={subCol.id} className="border border-gray-200 dark:border-gray-600"></td>;

                          if (subCol.data_type === 'file') {
                            const filesForCell = fileAttachments.filter(f => f.multiline_data_id === cellData.id);
                            return (
                              <td key={subCol.id} className="border border-gray-200 dark:border-gray-600 p-0 h-12">
                                <FileCellPreview
                                  files={filesForCell}
                                  onOpenManager={() => setFileManager({ isOpen: true, parentId: cellData.id })}
                                />
                              </td>
            
                            );
                          }
                          const isEditing = editingCell?.rowIndex === orderIndex && editingCell?.subColumnId === subCol.id;
                          const rawValue = getMultilineValue(orderIndex, subCol.id);
                          const options = (subCol.config as any)?.options || [];

                          return (
                            <td key={subCol.id} className="border border-gray-200 dark:border-gray-600 p-0 h-auto min-h-[40px] bg-white dark:bg-gray-900 align-top">
                              {isEditing ? (
                                <EditorInput 
                                  type={subCol.data_type}
                                  value={editValue}
                                  options={options}
                                  onChange={setEditValue}
                                  onBlur={() => { saveMultilineCell(cellData.id, subCol.id, editValue); setEditingCell(null); }}
                                  onEnter={() => { saveMultilineCell(cellData.id, subCol.id, editValue); setEditingCell(null); }}
                                  onEscape={() => setEditingCell(null)}
                                />
                              ) : (
                                <div
                                  onClick={() => startEditing(orderIndex, subCol.id, subCol.data_type)}
                                  className="w-full h-full min-h-[40px] px-2 py-1 cursor-cell flex items-center text-gray-900 dark:text-white"
                                >
                                  {subCol.data_type === 'boolean' ? (rawValue === 'true' ? '✅ Oui' : '❌ Non') : (
                                    <span className="truncate block w-full">{rawValue}</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="border border-gray-200 dark:border-gray-600 p-0 bg-white dark:bg-gray-900">
                          <button onClick={() => deleteRow(orderIndex)} className="w-full h-full flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900 min-h-[40px]">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rowIndices.length === 0 && <div className="p-8 text-center text-gray-500">Aucune donnée. Ajoutez une ligne pour commencer.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      {editingSubColumn && <SubColumnConfigModal subColumn={editingSubColumn} onSave={updateSubColumn} onClose={() => setEditingSubColumn(null)} />}
      <div className="z-[60] relative">
        <FileAttachmentManager
          parentId={fileManager.parentId}
          parentType="multiline"
          existingFiles={fileAttachments.filter(f => f.multiline_data_id === fileManager.parentId)}
          onFilesChange={handleFilesChange}
          isOpen={fileManager.isOpen}
          onClose={() => setFileManager({ isOpen: false, parentId: '' })}
        />
      </div>
    </div>
  );
}

// --- COMPOSANTS INTERNES ---

interface EditorInputProps {
  type: DataType; value: string; options?: string[]; onChange: (val: string) => void;
  onBlur: () => void; onEnter: () => void; onEscape: () => void;
}

function EditorInput({ type, value, onChange, onBlur, onEnter, onEscape, options }: EditorInputProps) {
  const commonProps = {
    className: "w-full h-full px-2 py-1 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
    autoFocus: true, onBlur,
  };

  if (type === 'boolean') {
    return <select {...commonProps} value={value} onChange={(e) => onChange(e.target.value)}><option value="false">Non</option><option value="true">Oui</option></select>;
  }
  if (type === 'select') {
    return <select {...commonProps} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Sélectionner...</option>{options?.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}</select>;
  }
  return <input {...commonProps} type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') onEnter(); if (e.key === 'Escape') onEscape(); }} />;
}

interface SubColumnConfigModalProps {
  subColumn: SubColumn; onSave: (id: string, updates: Partial<SubColumn>) => void; onClose: () => void;
}

function SubColumnConfigModal({ subColumn, onSave, onClose }: SubColumnConfigModalProps) {
  const [formData, setFormData] = useState({ label: subColumn.label, data_type: subColumn.data_type, width: subColumn.width || 150, options: (subColumn.config as any)?.options || [] });
  const [newOption, setNewOption] = useState('');

  const handleSave = () => { onSave(subColumn.id, { label: formData.label, data_type: formData.data_type, width: formData.width, config: { ...subColumn.config, options: formData.options } as any }); };
  const addOption = () => { if(newOption.trim()) { setFormData({...formData, options: [...formData.options, newOption.trim()]}); setNewOption(''); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Configurer la colonne</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
            <input type="text" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select value={formData.data_type} onChange={e => setFormData({...formData, data_type: e.target.value as DataType})} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white">
              <option value="text">Texte</option><option value="number">Nombre</option><option value="date">Date</option><option value="boolean">Oui/Non</option><option value="select">Liste</option><option value="file">Fichier</option>
            </select>
          </div>
           {formData.data_type === 'select' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
                <div className="flex space-x-2 mt-1">
                  <input value={newOption} onChange={e => setNewOption(e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="Ajouter une option..." onKeyDown={e => e.key === 'Enter' && addOption()}/>
                  <button onClick={addOption} className="bg-green-600 text-white px-3 rounded text-sm">+</button>
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                  {formData.options.map((opt: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, i: Key | null | undefined) => (
                    <div key={i} className="flex justify-between text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      <span>{opt}</span>
                      <button onClick={() => setFormData({...formData, options: formData.options.filter((_: any, idx: Key | null | undefined) => idx !== i)})} className="text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </div>
           )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Largeur (px)</label>
            <input type="number" value={formData.width} onChange={e => setFormData({...formData, width: parseInt(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border dark:border-gray-600">Annuler</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}