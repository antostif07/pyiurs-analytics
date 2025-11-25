// app/documents/[id]/components/FileCellPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileAttachment } from '@/app/types/documents';

interface FileCellPreviewProps {
  files: FileAttachment[];
  onOpenManager: () => void;
  // NOUVEAU: Une fonction pour demander l'ouverture du viewer
  onOpenFile: (file: FileAttachment, url: string) => void;
}

const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
    return '📎';
};

export default function FileCellPreview({ files, onOpenManager, onOpenFile }: FileCellPreviewProps) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUrls = async () => {
      const urls: Record<string, string> = {};
      for (const file of files) {
        if (file.file_path && !previewUrls[file.id]) {
          const { data } = await supabase.storage.from('files').getPublicUrl(file.file_path);
          if (data.publicUrl) urls[file.id] = data.publicUrl;
        }
      }
      if (Object.keys(urls).length > 0) setPreviewUrls(prev => ({ ...prev, ...urls }));
    };
    if (files.length > 0) fetchUrls();
  }, [files]);

  const handleFileClick = (e: React.MouseEvent, file: FileAttachment) => {
    e.stopPropagation();
    const url = previewUrls[file.id];
    if (url) {
      // On demande au parent d'ouvrir le viewer
      onOpenFile(file, url);
    }
  };

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenManager();
  }

  // L'affichage est identique, mais le <FileViewer> a disparu
  return (
    <div className="w-full h-full p-1 flex items-center space-x-1 group relative">
      {files.length === 0 ? (
        <div onClick={onOpenManager} className="w-full h-full flex items-center justify-center text-gray-400 hover:text-blue-600 cursor-pointer">
          <span className="text-sm">Ajouter...</span>
        </div>
      ) : (
        <>
          {files.slice(0, 3).map((file) => {
            const url = previewUrls[file.id];
            const isImage = file.file_type.startsWith('image/');
            const isPdf = file.file_type === 'application/pdf';
            const fileExtension = file.file_name.split('.').pop()?.toUpperCase() || '';

            return (
              <div
                key={file.id}
                // onClick={(e) => handleFileClick(e, file)}
                onClick={handleManageClick}
                className="relative h-full aspect-square cursor-pointer"
                title={`Voir ${file.file_name}`}
              >
                {isImage && url ? (
                  <img src={url} alt={file.file_name} className="h-full w-full object-cover rounded-sm border" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-sm border">
                    <span className="text-xl">{isPdf ? '📄' : getFileIcon(file.file_type)}</span>
                    <span className="text-[10px] font-bold mt-0.5">{fileExtension}</span>
                  </div>
                )}
              </div>
            );
          })}
          {files.length > 3 && (
            <div className="h-full aspect-square flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-sm text-xs font-bold">
              +{files.length - 3}
            </div>
          )}
        </>
      )}
      
      {/* <div 
        onClick={handleManageClick}
        className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        Gérer
      </div> */}
    </div>
  );
}