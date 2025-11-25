// app/documents/[id]/components/FileAttachmentManager.tsx
'use client';

import { useState, useRef, useEffect, JSX } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileAttachment } from '@/app/types/documents';

type ParentType = 'cell' | 'multiline';

interface FileAttachmentManagerProps {
  parentId: string;
  parentType: ParentType;
  existingFiles: FileAttachment[];
  onFilesChange: (newFiles: FileAttachment[], deletedFileId?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type PreviewUrls = Record<string, string>;

export default function FileAttachmentManager({
  parentId,
  parentType,
  existingFiles,
  onFilesChange,
  isOpen,
  onClose
}: FileAttachmentManagerProps): JSX.Element | null {
  const params = useParams();
  const documentId = params.id as string;
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [previewUrls, setPreviewUrls] = useState<PreviewUrls>({});
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadPreviewUrls = async () => {
      const urls: PreviewUrls = {};
      for (const file of existingFiles) {
        if (file.file_path) {
          const { data } = await supabase.storage.from('files').getPublicUrl(file.file_path);
          urls[file.id] = data.publicUrl;
        }
      }
      setPreviewUrls(urls);
    };
    if (isOpen && existingFiles.length > 0) {
      loadPreviewUrls();
    }
  }, [isOpen, existingFiles]);

  const handleFileSelect = async (files: FileList) => {
    if (!parentId) {
      setError("ID du parent manquant. Impossible d'attacher le fichier.");
      return;
    }
    setUploading(true);
    setError('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `documents/${documentId}/${parentType}/${parentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Erreur d'upload: ${uploadError.message}`);

        const insertData = {
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user!.id,
          cell_data_id: parentType === 'cell' ? parentId : null,
          multiline_data_id: parentType === 'multiline' ? parentId : null,
        };

        const { data: dbData, error: dbError } = await supabase
          .from('file_attachments')
          .insert(insertData)
          .select()
          .single();

        if (dbError) {
          await supabase.storage.from('files').remove([filePath]); // Cleanup
          throw new Error(`Erreur base de données: ${dbError.message}`);
        }
        return dbData;
      });

      const newFiles: FileAttachment[] = await Promise.all(uploadPromises);
      onFilesChange(newFiles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  
  const deleteFile = async (fileId: string, filePath: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    try {
      const { error: storageError } = await supabase.storage.from('files').remove([filePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('file_attachments').delete().eq('id', fileId);
      if (dbError) throw dbError;

      onFilesChange([], fileId); // Notifier la suppression
    } catch (err: any) {
      setError('Erreur lors de la suppression du fichier: ' + err.message);
    }
  };

  // Le reste du JSX est identique à votre FileUploader.tsx (header, dropzone, liste des fichiers, etc.)
  // On ne le recopie pas ici pour rester concis. Il suffit de copier le JSX de FileUploader ici.
  // ... (copiez tout le contenu de la fonction `return` de `FileUploader.tsx` ici)
  if (!isOpen) return null;
  // Assurez-vous d'utiliser les fonctions `handleFileSelect` et `deleteFile` de ce composant.
  // Le JSX reste le même, la logique a juste été généralisée.

  // --- COPIE DU JSX DE VOTRE FILEUPLOADER ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
        {/* ... Header ... */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestion des fichiers</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Erreur:</strong> {error}
            </div>
          )}
          
          {/* ... Dropzone ... */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-6 ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple onChange={(e) => e.target.files && handleFileSelect(e.target.files)} className="hidden"/>
            {uploading ? <p>Upload en cours...</p> : <p>Glissez-déposez ou cliquez pour sélectionner</p>}
          </div>

          {/* ... Liste des fichiers ... */}
          <div>
            <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Fichiers ({existingFiles.length})</h4>
            {existingFiles.length === 0 ? (
              <p className="text-gray-500">Aucun fichier attaché</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingFiles.map((file) => (
                   <div key={file.id} className="bg-gray-50 p-3 rounded border">
                       <a href={previewUrls[file.id]} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 truncate block">{file.file_name}</a>
                       <p className="text-sm text-gray-500">{file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}</p>
                       <button onClick={() => deleteFile(file.id, file.file_path)} className="text-red-500 text-sm mt-2">Supprimer</button>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ... Footer ... */}
        <div className="border-t p-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Terminer</button>
        </div>
      </div>
    </div>
  );
}