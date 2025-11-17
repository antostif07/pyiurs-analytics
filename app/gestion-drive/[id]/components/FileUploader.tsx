// app/documents/[id]/components/FileUploader.tsx
'use client';

import { useState, useRef, useEffect, JSX } from 'react';
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

type PreviewUrls = Record<string, string>;

export default function FileUploader({ 
  cellDataId, 
  columnId, 
  existingFiles, 
  onFilesChange, 
  isOpen, 
  onClose 
}: FileUploaderProps): JSX.Element | null {
  const params = useParams();
  const documentId = params.id as string;
  
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [previewUrls, setPreviewUrls] = useState<PreviewUrls>({});
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  /** 🔥 VALIDATION DES IDENTIFIANTS AVANT TOUT */
  const validateIds = (): string | null => {
    console.log('🔍 Validation check:', {
      userId: user?.id,
      documentId,
      cellDataId,
      columnId
    });

    if (!user?.id) return "Utilisateur non authentifié";

    if (!documentId || documentId === "" || documentId === "undefined") 
      return `documentId invalide: ${documentId}`;

    if (!cellDataId || cellDataId === "" || cellDataId === "undefined") 
      return `cellDataId vide: ${cellDataId}`;

    if (!columnId || columnId === "" || columnId === "undefined") 
      return `columnId vide: ${columnId}`;

    return null;
  };

  useEffect((): void => {
    const loadPreviewUrls = async (): Promise<void> => {
      const urls: PreviewUrls = {};
      
      for (const file of existingFiles) {
        try {
          const url: string = await getFileUrl(file.file_path);
          urls[file.id] = url;
        } catch (error: unknown) {
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
    try {
      const { data } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error: unknown) {
      console.error('Failed to get file URL:', error);
      return '';
    }
  };

  /** 🔥 ENHANCED FILE UPLOAD WITH BETTER ERROR HANDLING */
  const handleFileSelect = async (files: FileList): Promise<void> => {
    const validationError: string | null = validateIds();
    if (validationError) {
      console.error('❌ Validation failed:', validationError);
      setError(validationError);
      return;
    }

    setUploading(true);
    setError('');
    
    try {
      const uploadPromises: Promise<FileAttachment>[] = Array.from(files).map(async (file: File): Promise<FileAttachment> => {
        // File size validation
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Le fichier ${file.name} dépasse 10MB`);
        }

        const fileExt: string = file.name.split('.').pop() || 'bin';
        const fileName: string = `${crypto.randomUUID()}.${fileExt}`;

        // Enhanced file path construction
        const filePath: string = `documents/${documentId}/${columnId}/${cellDataId}/${fileName}`;

        console.log("➡️ Uploading file:", {
          originalName: file.name,
          storagePath: filePath,
          size: file.size,
          type: file.type
        });

        // 🔥 STEP 1: Upload to storage with enhanced error handling
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Storage upload error details:', {
            message: uploadError.message,
            name: uploadError.name,
          });
          
          // Check if it's a bucket policy error
          if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission')) {
            throw new Error(`Erreur de permissions: Vérifiez les politiques du bucket "files"`);
          }
          
          throw new Error(`Erreur upload: ${uploadError.message}`);
        }

        console.log("✅ Storage upload successful:", uploadData);

        // 🔥 STEP 2: Verify the file was uploaded
        const { data: verifyData, error: verifyError } = await supabase.storage
          .from('files')
          .list(`documents/${documentId}/${columnId}/${cellDataId}`, {
            limit: 1,
            offset: 0,
            search: fileName
          });

        if (verifyError) {
          console.error('❌ Verification error:', verifyError);
        } else {
          console.log('✅ File verification:', verifyData);
        }

        // 🔥 STEP 3: Insert database record
        console.log("➡️ Inserting DB record:", {
          cell_data_id: cellDataId,
          column_id: columnId,
          uploaded_by: user?.id,
          file_path: filePath
        });

        const { data: dbData, error: dbError } = await supabase
          .from('file_attachments')
          .insert([
            {
              cell_data_id: cellDataId,
              column_id: columnId,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: user!.id, // We validated user exists above
              order_index: existingFiles.length
            }
          ])
          .select()
          .single();

        if (dbError) {
          console.error('❌ Database error:', dbError);
          
          // Cleanup: Remove the uploaded file if DB insert fails
          await supabase.storage.from('files').remove([filePath]);
          throw new Error(`Erreur base de données: ${dbError.message}`);
        }

        console.log("✅ Database insert successful:", dbData);
        return dbData;
      });

      const newFiles: FileAttachment[] = await Promise.all(uploadPromises);
      onFilesChange([...existingFiles, ...newFiles]);
      
    } catch (error: unknown) {
      console.error('💥 Upload process failed:', error);
      const errorMessage: string = error instanceof Error ? error.message : "Erreur inconnue lors de l'upload";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string): Promise<void> => {
    if (!confirm('Supprimer ce fichier ?')) return;

    try {
      console.log('🗑️ Deleting file:', { fileId, filePath });

      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Storage delete error:', storageError);
        throw storageError;
      }

      const { error: dbError } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('❌ Database delete error:', dbError);
        throw dbError;
      }

      onFilesChange(existingFiles.filter((file: FileAttachment) => file.id !== fileId));
      
      setPreviewUrls((prev: PreviewUrls) => {
        const updatedUrls: PreviewUrls = { ...prev };
        delete updatedUrls[fileId];
        return updatedUrls;
      });

      console.log('✅ File deleted successfully');

    } catch (error: unknown) {
      console.error('💥 Delete failed:', error);
      setError('Erreur lors de la suppression du fichier');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    
    const files: FileList = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('zip')) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k: number = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i: number = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (fileType: string): boolean => fileType.startsWith('image/');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gestion des fichiers
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Erreur:</strong> {error}
              <br />
              <small className="text-red-600">
                Vérifiez la console pour plus de détails
              </small>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(): void => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-6 
              ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            onClick={(): void => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                if (e.target.files) {
                  handleFileSelect(e.target.files);
                }
              }}
              className="hidden"
            />

            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin h-10 w-10 mx-auto border-b-2 border-blue-600 rounded-full mb-2"></div>
                <p>Upload en cours...</p>
              </div>
            ) : (
              <div>
                <p className="text-lg mb-2">📁 Glissez-déposez des fichiers ou cliquez pour sélectionner</p>
                <p className="text-sm text-gray-500">Taille maximale: 10MB par fichier</p>
              </div>
            )}
          </div>

          {/* Liste des fichiers */}
          <div>
            <h4 className="font-medium mb-4 text-gray-900 dark:text-white">
              Fichiers ({existingFiles.length})
            </h4>

            {existingFiles.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun fichier attaché</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingFiles.map((file: FileAttachment) => (
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">
            {existingFiles.length} fichier(s) attaché(s)
          </span>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Terminer
          </button>
        </div>

      </div>
    </div>
  );
}

interface FileItemProps {
  file: FileAttachment;
  previewUrl?: string;
  onDelete: (fileId: string, filePath: string) => void;
  getFileIcon: (fileType: string) => string;
  formatFileSize: (bytes: number) => string;
  isImageFile: (fileType: string) => boolean;
}

function FileItem({ 
  file, 
  previewUrl,
  onDelete, 
  getFileIcon, 
  formatFileSize,
  isImageFile
}: FileItemProps): JSX.Element {

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3 flex-1 truncate">
          {isImageFile(file.file_type) && previewUrl ? (
            <img 
              src={previewUrl} 
              alt={file.file_name} 
              className="w-12 h-12 object-cover rounded" 
            />
          ) : (
            <span className="text-2xl">{getFileIcon(file.file_type)}</span>
          )}
          
          <div className="truncate">
            <a 
              href={previewUrl} 
              className="font-medium block truncate text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" 
              target="_blank"
              rel="noopener noreferrer"
            >
              {file.file_name}
            </a>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.file_size)} • {file.file_type}
            </p>
          </div>
        </div>

        <button 
          onClick={(): void => onDelete(file.id, file.file_path)}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
          title="Supprimer le fichier"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Ajouté le {new Date(file.uploaded_at).toLocaleString('fr-FR')}
      </p>
    </div>
  );
}