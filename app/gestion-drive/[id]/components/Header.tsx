import { Document } from "@/app/types/documents";
import { Profile } from "@/contexts/AuthContext";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import PermissionManager from "./PermissionManager";
import { supabase } from "@/lib/supabase";

interface Props {
    document: Document,
    handleDocument: Dispatch<SetStateAction<Document | null>>
    updateDocumentName: () => Promise<void>
    isOwner: boolean
    darkMode: boolean
    setDarkMode: Dispatch<SetStateAction<boolean>>
    user: User
    profile: Profile|null
}

export default function DocumentEditorHeader({
    document, 
    handleDocument, 
    updateDocumentName, 
    isOwner,
    darkMode, setDarkMode,
    user, profile
}: Props) {
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
              
              {/* Séparateur */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              
              {/* Nom du document avec édition */}
              <div className="flex items-center space-x-2 group">
                {document.isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={document.editName || document.name}
                      onChange={(e) => handleDocument(prev => prev ? {...prev, editName: e.target.value} : null)}
                      className="px-3 py-1 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold min-w-[200px]"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          await updateDocumentName();
                        } else if (e.key === 'Escape') {
                          handleDocument(prev => prev ? {...prev, isEditing: false, editName: ''} : null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={updateDocumentName}
                        className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                        title="Sauvegarder"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => handleDocument(prev => prev ? {...prev, isEditing: false, editName: ''} : null)}
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
                      onClick={() => handleDocument(prev => prev ? {...prev, isEditing: true, editName: prev.name} : null)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                      title="Renommer le document"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>

              {/* Description */}
              {document.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm hidden lg:block border-l border-gray-300 dark:border-gray-600 pl-4">
                  {document.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mode sombre/clair */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              
              {/* Avatar utilisateur */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              {/* <button
                onClick={() => setShowConfig(!showConfig)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  showConfig 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>⚙️</span>
                <span>{showConfig ? 'Masquer configuration' : 'Configurer colonnes'}</span>
              </button> */}

              <PermissionManager
                documentId={document.id}
                currentPermissions={document?.default_permissions}
                onPermissionsChange={async (newPermissions) => {
                  try {
                    const { error } = await supabase
                      .from('documents')
                      .update({ 
                        default_permissions: newPermissions,
                        updated_at: new Date().toISOString()
                      } as never)
                      .eq('id', document.id);
                    
                    if (error) throw error;
                    
                    // Mettre à jour le document localement
                    handleDocument(prev => prev ? {
                      ...prev,
                      default_permissions: newPermissions,
                      updated_at: new Date().toISOString()
                    } : null);
                    
                  } catch (error) {
                    console.error('Error updating permissions:', error);
                    alert('Erreur lors de la mise à jour des permissions.');
                  }
                }}
                documentOwnerId={document.created_by} // 🔥 IMPORTANT : Passer l'ID du propriétaire
              />
            </div>
            
            {/* <div className="flex items-center space-x-3">
              <ExportImport
                documentId={documentId}
                columns={columns}
                rows={rows}
                cellData={cellData}
              />
              
              <button
                onClick={addNewRow}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>+</span>
                <span>Ajouter ligne</span>
              </button>
            </div> */}
          </div>

          {/* Barre de recherche et filtres */}
          {/* <SearchAndFilters
            columns={columns}
            onSearch={setSearchQuery}
            onFilter={setFilters}
            onSort={setSortConfig}
          /> */}
        </div>
      </header>
    )
}