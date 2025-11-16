// app/documents/[id]/components/PermissionManager.tsx
'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedUser } from '@/app/users/users.client';
import { DocumentPermissions, PermissionAction, PermissionRole } from '@/app/types/documents';

interface PermissionManagerProps {
  documentId: string;
  columnId?: string;
  currentPermissions: DocumentPermissions;
  onPermissionsChange: (permissions: any) => void;
}

export default function PermissionManager({
  documentId,
  columnId,
  currentPermissions,
  onPermissionsChange
}: PermissionManagerProps) {
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Initialiser les permissions par défaut si non définies
  const permissions: DocumentPermissions = currentPermissions || {
    read: ['all'],
    write: ['all'],
    delete: ['all']
  };

  useEffect(() => {
    if (showDialog) {
      fetchUsers();
    }
  }, [showDialog]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('full_name');
      
      if (usersError) throw usersError;
      setUsers((usersData as EnhancedUser[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (role: PermissionRole, action: PermissionAction, value: boolean) => {
    const newPermissions = { ...permissions };
    
    // S'assurer que chaque action est un tableau
    if (!Array.isArray(newPermissions[action])) {
      newPermissions[action] = [];
    }
    
    if (value) {
      // Ajouter le rôle s'il n'existe pas déjà
      if (!newPermissions[action].includes(role)) {
        newPermissions[action] = [...newPermissions[action], role];
      }
    } else {
      // Retirer le rôle
      newPermissions[action] = newPermissions[action].filter(r => r !== role);
    }
    
    console.log('Updating permissions:', newPermissions);
    onPermissionsChange(newPermissions);
  };

  const hasPermission = (role: PermissionRole, action: PermissionAction): boolean => {
    if (!permissions || !permissions[action]) {
      return false;
    }
    return permissions[action].includes(role);
  };

  const handleSavePermissions = async () => {
    try {
      setLoading(true);
      
      // Ici vous pouvez sauvegarder les permissions dans la base de données
      // soit dans la table documents, soit dans une table dédiée
      console.log('Saving permissions:', permissions);
      
      // Fermer le modal après sauvegarde
      setShowDialog(false);
      
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si l'utilisateur actuel peut gérer les permissions
  const canManagePermissions = user && (
    hasPermission(user.id, 'write') || 
    hasPermission('all', 'write') || 
    hasPermission('authenticated', 'write')
  );

  if (!canManagePermissions) {
    return (
      <button
        disabled
        className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed flex items-center space-x-2"
        title="Vous n'avez pas les permissions pour gérer les accès"
      >
        <span>👥</span>
        <span>Permissions</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowDialog(true)}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
      >
        <span>👥</span>
        <span>Permissions</span>
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gestion des permissions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {columnId ? 'Permissions pour cette colonne' : 'Permissions globales du document'}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Permissions globales */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Permissions globales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {(['read', 'write', 'delete'] as PermissionAction[]).map(action => (
                    <div key={action} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <label className="block font-medium capitalize text-gray-900 dark:text-white">
                        {action === 'read' ? 'Lecture' : 
                         action === 'write' ? 'Écriture' : 'Suppression'}
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={hasPermission('all', action)}
                            onChange={(e) => updatePermission('all', action, e.target.checked)}
                            className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          Tous les utilisateurs
                        </label>
                        <label className="flex items-center text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={hasPermission('authenticated', action)}
                            onChange={(e) => updatePermission('authenticated', action, e.target.checked)}
                            className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          Utilisateurs connectés
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions par utilisateur */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Permissions par utilisateur</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {users.length} utilisateur(s) {loading && '(Chargement...)'}
                  </span>
                </div>
                
                <div className="max-h-80 overflow-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Chargement des utilisateurs...
                    </div>
                  ) : (
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                            Utilisateur
                          </th>
                          {(['read', 'write', 'delete'] as PermissionAction[]).map(action => (
                            <th key={action} className="p-3 text-center text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {action === 'read' ? 'Lire' : 
                              action === 'write' ? 'Écrire' : 'Supprimer'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {users.map(userItem => (
                          <tr key={userItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="p-3">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {userItem.full_name || 'Sans nom'}
                                  {userItem.id === user?.id && (
                                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Vous)</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {userItem.email}
                                </div>
                                {userItem.role && (
                                  <div className="text-xs mt-1">
                                    <span className={`px-1.5 py-0.5 rounded-full ${
                                      userItem.role === 'admin' 
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : userItem.role === 'manager'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                      {userItem.role}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            {(['read', 'write', 'delete'] as PermissionAction[]).map(action => (
                              <td key={action} className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={hasPermission(userItem.id, action)}
                                  onChange={(e) => updatePermission(userItem.id, action, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Informations */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Informations sur les permissions
                </h5>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Lecture</strong> : Voir le document/colonne</li>
                  <li>• <strong>Écriture</strong> : Modifier les données</li>
                  <li>• <strong>Suppression</strong> : Supprimer des lignes/colonnes</li>
                  <li>• Les permissions utilisateur remplacent les permissions globales</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDialog(false)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sauvegarde...</span>
                    </>
                  ) : (
                    <span>Appliquer les permissions</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}