// app/documents/[id]/components/FileUploader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileAttachment } from '@/app/types/documents';

interface FileUploaderProps {
  cellDataId: string;
  columnId: string;
  existingFiles: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function FileUploader({ 
  cellDataId, 
  columnId, 
  existingFiles, 
  onFilesChange, 
  isOpen, 
  onClose 
}: FileUploaderProps) {
  const params = useParams();
  const documentId = params.id as string;
  
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Charger les URLs de prévisualisation pour les fichiers existants
    const loadPreviewUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const file of existingFiles) {
        try {
          const url = await getFileUrl(file.file_path);
          urls[file.id] = url;
        } catch (error) {
          console.error('Error loading preview for file:', file.file_name, error);
        }
      }
      
      setPreviewUrls(urls);
    };

    if (isOpen && existingFiles.length > 0) {
      loadPreviewUrls();
    }
  }, [isOpen, existingFiles]);

  const getFileUrl = async (filePath: string): Promise<string> => {
    const { data } = await supabase.storage
      .from('files')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  const handleFileSelect = async (files: FileList) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Vérifier la taille du fichier (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Le fichier ${file.name} dépasse la taille maximale de 10MB`);
        }

        // Générer un chemin unique
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `documents/${documentId}/${columnId}/${cellDataId}/${fileName}`;

        console.log('Uploading file to path:', filePath);

        // Uploader le fichier vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        // Créer l'enregistrement dans la base de données
        const { data, error } = await supabase
          .from('file_attachments')
          .insert([
            {
              cell_data_id: cellDataId,
              column_id: columnId,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: user.id,
              order_index: existingFiles.length
            } as never
          ])
          .select()
          .single();

        if (error) {
          console.error('Database insert error:', error);
          throw error;
        }

        return data;
      });

      const newFiles = await Promise.all(uploadPromises);
      console.log('Successfully uploaded files:', newFiles);
      onFilesChange([...existingFiles, ...newFiles]);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors du téléchargement des fichiers');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return;

    try {
      console.log('Deleting file:', filePath);

      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw storageError;
      }

      // Supprimer de la base de données
      const { error } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Database delete error:', error);
        throw error;
      }

      // Mettre à jour l'état local
      onFilesChange(existingFiles.filter(file => file.id !== fileId));
      
      // Nettoyer la prévisualisation
      setPreviewUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[fileId];
        return newUrls;
      });

      console.log('File deleted successfully');

    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Erreur lors de la suppression du fichier');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return '📝';
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
      return '📊';
    } else if (fileType.includes('zip') || fileType.includes('archive')) {
      return '📦';
    } else {
      return '📎';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gestion des fichiers
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Zone de dépôt */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mb-6 ${
              dragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
              disabled={uploading}
            />
            
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              {uploading ? (
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              ) : (
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-2 text-lg">
              {uploading ? 'Téléchargement en cours...' : 'Glissez-déposez des fichiers ici'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              ou cliquez pour sélectionner des fichiers
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Formats supportés: tous • Taille max: 10MB par fichier
            </p>
          </div>

          {/* Liste des fichiers */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              Fichiers attachés ({existingFiles.length})
            </h4>
            
            {existingFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Aucun fichier attaché</p>
                <p className="text-sm mt-1">Ajoutez des fichiers en les glissant-déposant ou en cliquant ci-dessus</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingFiles.map((file) => (
                  <FileItem 
                    key={file.id} 
                    file={file}
                    previewUrl={previewUrls[file.id]}
                    onDelete={deleteFile}
                    getFileIcon={getFileIcon}
                    formatFileSize={formatFileSize}
                    isImageFile={isImageFile}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div>
              {existingFiles.length} fichier(s) attaché(s)
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Terminer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant d'élément de fichier
function FileItem({ 
  file, 
  previewUrl,
  onDelete, 
  getFileIcon, 
  formatFileSize,
  isImageFile
}: { 
  file: FileAttachment;
  previewUrl?: string;
  onDelete: (fileId: string, filePath: string) => void;
  getFileIcon: (fileType: string) => string;
  formatFileSize: (bytes: number) => string;
  isImageFile: (fileType: string) => boolean;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {isImageFile(file.file_type) && previewUrl && !imageError ? (
            <div className="relative flex-shrink-0">
              <img 
                src={previewUrl} 
                alt={file.file_name}
                className="w-12 h-12 object-cover rounded"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <span className="text-2xl flex-shrink-0">{getFileIcon(file.file_type)}</span>
          )}
          
          <div className="flex-1 min-w-0">
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium truncate block"
              title={file.file_name}
            >
              {file.file_name}
            </a>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.file_size)} • {file.file_type || 'Type inconnu'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onDelete(file.id, file.file_path)}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 ml-2 flex-shrink-0 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
          title="Supprimer"
        >
          ✕
        </button>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Ajouté le {new Date(file.uploaded_at).toLocaleDateString('fr-FR')} à {new Date(file.uploaded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}