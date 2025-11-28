import { useState } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { Document } from '@/app/types/documents';

interface DocumentHeaderProps {
  document: Document;
  user: User;
  profile?: any;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onDocumentNameUpdate: (newName: string) => Promise<void>;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  document,
  user,
  profile,
  darkMode,
  onDarkModeToggle,
  onDocumentNameUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(document.name);
  const isOwner = user.id === document.created_by;

  const handleSaveName = async () => {
    await onDocumentNameUpdate(editName);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(document.name);
    setIsEditing(false);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link 
              href="/gestion-drive"
              className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-lg"
            >
              <span>←</span>
              <span className="hidden sm:inline">Mes Documents</span>
              <span className="sm:hidden">Retour</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            
            <div className="flex items-center space-x-2 group">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold min-w-[200px]"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') await handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={handleSaveName}
                      className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                      title="Sauvegarder"
                    >
                      ✅
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Annuler"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                    <span>{document.name}</span>
                    {isOwner && (
                      <span 
                        className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full"
                        title="Vous êtes le propriétaire de ce document"
                      >
                        👑 Propriétaire
                      </span>
                    )}
                  </h1>
                  <button
                    onClick={() => {
                      setEditName(document.name);
                      setIsEditing(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                    title="Renommer le document"
                  >
                    ✏️
                  </button>
                </>
              )}
            </div>

            {document.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm hidden lg:block border-l border-gray-300 dark:border-gray-600 pl-4">
                {document.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onDarkModeToggle}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};