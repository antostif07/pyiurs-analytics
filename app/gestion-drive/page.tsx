'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Document } from '../types/documents';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editName, setEditName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  const { user, profile, loading, supabase } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async (): Promise<void> => {
    if (!user) return;
    
    setLoadingDocuments(true);
    try {
      // Récupérer tous les documents créés par l'utilisateur
      const { data: myDocuments, error: myDocsError } = await supabase
        .from('documents')
        .select('*')
        .eq('created_by', user.id);

      if (myDocsError) throw myDocsError;

      // CORRECTION : Récupérer les documents accessibles avec une requête correcte
      const { data: accessibleDocuments, error: accessibleDocsError } = await supabase
        .from("documents")
        .select("*")
        .neq("created_by", user.id)
        .or(`
          default_permissions->'read' ? 'all',
          default_permissions->'read' ? 'authenticated'
        `);

      if (accessibleDocsError) {
        console.error('Error fetching accessible documents:', accessibleDocsError);
        // Si la requête complexe échoue, on utilise une approche alternative
        await fetchAccessibleDocumentsAlternative(myDocuments || []);
        return;
      }

      // Fusionner et dédupliquer les documents
      const allDocuments = [
        ...(myDocuments || []),
        ...(accessibleDocuments || [])
      ];

      // Dédupliquer par ID
      const uniqueDocuments = allDocuments.reduce((acc: Document[], current: Document) => {
        const exists = acc.find(doc => doc.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Trier par date de création décroissante
      uniqueDocuments.sort((a: Document, b: Document) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(uniqueDocuments as Document[]);

    } catch (error) {
      console.error('Error fetching documents:', error);
      // En cas d'erreur, essayer l'approche alternative
      await fetchAccessibleDocumentsAlternative([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Approche alternative si la requête complexe échoue
  const fetchAccessibleDocumentsAlternative = async (myDocuments: Document[]): Promise<void> => {
    try {
      // Récupérer tous les documents et filtrer côté client
      const { data: allDocuments, error } = await supabase
        .from('documents')
        .select('*')
        .neq('created_by', user!.id);

      if (error) throw error;

      // Filtrer côté client les documents accessibles
      const accessibleDocuments = (allDocuments || []).filter((doc: Document) => {
        const permissions = doc.default_permissions as { read?: string[] };
        return permissions?.read?.includes('all') || 
               permissions?.read?.includes('authenticated') ||
               permissions?.read?.includes(user!.id);
      });

      // Fusionner avec les documents de l'utilisateur
      const mergedDocuments = [
        ...myDocuments,
        ...accessibleDocuments
      ];

      // Dédupliquer et trier
      const uniqueDocuments = mergedDocuments.reduce((acc: Document[], current: Document) => {
        const exists = acc.find(doc => doc.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      uniqueDocuments.sort((a: Document, b: Document) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(uniqueDocuments);

    } catch (error) {
      console.error('Error in alternative fetch:', error);
      // Si tout échoue, afficher seulement les documents de l'utilisateur
      setDocuments(myDocuments);
    }
  };

  const createNewDocument = async (): Promise<void> => {
    if (creating || !user) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([
          {
            name: 'Nouveau Document',
            description: 'Document dynamique personnalisable',
            created_by: user.id,
            is_active: true,
            default_permissions: { 
              read: ['all'], 
              write: ['all'],
              delete: ['all']
            },
            theme_config: {}
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Rediriger vers l'éditeur
      router.push(`/gestion-drive/${(data as Document).id}`);
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Erreur lors de la création du document.');
    } finally {
      setCreating(false);
    }
  };

  const startEditDocument = (doc: Document): void => {
    setEditingDocument(doc);
    setEditName(doc.name);
  };

  const updateDocumentName = async (): Promise<void> => {
    if (!editingDocument || !user) return;

    try {
      // Vérifier que l'utilisateur a le droit de modifier ce document
      const canEdit = editingDocument.created_by === user.id || 
        hasPermission(editingDocument.default_permissions, 'write', user.id);

      if (!canEdit) {
        alert('Vous n\'avez pas les permissions pour modifier ce document.');
        return;
      }

      const { error } = await supabase
        .from('documents')
        .update({ 
          name: editName,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingDocument.id);

      if (error) throw error;

      // Mettre à jour localement
      setDocuments(documents.map(doc => 
        doc.id === editingDocument.id ? { ...doc, name: editName } : doc
      ));
      
      setEditingDocument(null);
      setEditName('');
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Erreur lors de la modification du document.');
    }
  };

  const deleteDocument = async (docId: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?') || !user) return;

    try {
      // Vérifier que l'utilisateur est le créateur du document
      const documentToDelete = documents.find(doc => doc.id === docId);
      if (!documentToDelete) return;

      if (documentToDelete.created_by !== user.id) {
        alert('Vous ne pouvez supprimer que vos propres documents.');
        return;
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      // Mettre à jour localement
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression du document.');
    }
  };

  // Helper function pour vérifier les permissions
  const hasPermission = (
    permissions: any, 
    action: 'read' | 'write' | 'delete', 
    userId?: string
  ): boolean => {
    if (!permissions || !permissions[action]) return false;
    
    const actionPermissions = permissions[action];
    return actionPermissions.includes('all') || 
           actionPermissions.includes('authenticated') ||
           (userId && actionPermissions.includes(userId));
  };

  // Vérifier si l'utilisateur peut modifier un document
  const canEditDocument = (doc: Document): boolean => {
    if (!user) return false;
    return doc.created_by === user.id || 
      hasPermission(doc.default_permissions, 'write', user.id);
  };

  // Vérifier si l'utilisateur peut supprimer un document
  const canDeleteDocument = (doc: Document): boolean => {
    if (!user) return false;
    return doc.created_by === user.id ||
      hasPermission(doc.default_permissions, 'delete', user.id);
  };

  // Filtrer les documents par recherche
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading && !user) {
    return (
      <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 transition-colors`}>
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <span>←</span>
                <span>Retour</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mes Documents
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {profile?.full_name || 'Utilisateur'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestion des Documents
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Créez et gérez vos documents dynamiques
            </p>
          </div>
          
          <button
            onClick={createNewDocument}
            disabled={creating}
            className={`bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 ${
              creating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Création...</span>
              </>
            ) : (
              <>
                <span>+</span>
                <span>Nouveau Document</span>
              </>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingDocuments ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement de vos documents...</p>
          </div>
        ) : (
          /* Documents Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 group relative"
              >
                {/* Indicateur de propriété */}
                {doc.created_by === user.id && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      Propriétaire
                    </span>
                  </div>
                )}

                {/* Indicateur de document partagé */}
                {doc.created_by !== user.id && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Partagé
                    </span>
                  </div>
                )}

                {/* Menu d'actions */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  {canEditDocument(doc) && (
                    <button
                      onClick={() => startEditDocument(doc)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                      title="Renommer"
                    >
                      ✏️
                    </button>
                  )}
                  {canDeleteDocument(doc) && (
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <Link href={`/gestion-drive/${doc.id}`} className="block">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl mb-4">
                    📄
                  </div>

                  {/* Document Info */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 pr-12">
                    {doc.name}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {doc.description || 'Document dynamique personnalisable'}
                  </p>

                  {/* Metadata */}
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      doc.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {doc.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </Link>
              </div>
            ))}

            {/* Empty State */}
            {filteredDocuments.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {search ? 'Aucun document trouvé' : 'Aucun document'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
                  {search 
                    ? 'Aucun document ne correspond à votre recherche. Essayez d\'autres termes.'
                    : 'Commencez par créer votre premier document dynamique.'
                  }
                </p>
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Effacer la recherche
                  </button>
                ) : (
                  <button
                    onClick={createNewDocument}
                    disabled={creating}
                    className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors ${
                      creating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {creating ? 'Création...' : 'Créer un document'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 Gestion Drive. {filteredDocuments.length} document(s)
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Connecté en tant que {user.email}
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de renommage */}
      {editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Renommer le document
            </h3>
            
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              placeholder="Nom du document"
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateDocumentName();
                if (e.key === 'Escape') setEditingDocument(null);
              }}
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingDocument(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={updateDocumentName}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}