// app/documents/[id]/components/FileCellPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileAttachment } from '@/app/types/documents';
import { Paperclip } from 'lucide-react';

interface FileCellPreviewProps {
  files: FileAttachment[];
  onOpenManager: () => void;
}

const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
  if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
  return '📎';
};

export default function FileCellPreview({ files, onOpenManager }: FileCellPreviewProps) {
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

  return (
    <div
      onClick={onOpenManager}
      className="w-12 h-12 p-1 flex items-center justify-start space-x-1 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      title="Gérer les fichiers"
    >
      {files.length === 0 ? (
        <div className="w-12 h-12 flex items-center justify-center text-gray-400">
          <Paperclip className="h-4 w-4 mr-1" />
          <span className="text-sm">Ajouter...</span>
        </div>
      ) : (
        <>
          {files.slice(0, 4).map((file) => {
            const url = previewUrls[file.id];
            const isImage = file.file_type.startsWith('image/');
            const fileExtension = file.file_name.split('.').pop()?.toUpperCase() || '';

            return (
              <div key={file.id} className="relative h-full aspect-square flex-shrink-0">
                {isImage && url ? (
                  <img src={url} alt={file.file_name} className="h-full w-full object-cover rounded-sm border" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-sm border">
                    <span className="text-xl">{getFileIcon(file.file_type)}</span>
                    <span className="text-[10px] font-bold mt-0.5">{fileExtension}</span>
                  </div>
                )}
              </div>
            );
          })}
          {files.length > 4 && (
            <div className="h-full aspect-square flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-sm text-xs font-bold flex-shrink-0">
              +{files.length - 4}
            </div>
          )}
        </>
      )}
    </div>
  );
}