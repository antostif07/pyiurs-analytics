// app/documents/[id]/components/HistoryTracker.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface HistoryItem {
  id: string;
  document_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  action: 'create' | 'update' | 'delete' | 'rename' | 'permission_change';
  table_name: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  description: string;
  created_at: string;
}

interface HistoryTrackerProps {
  documentId: string;
}

export default function HistoryTracker({ documentId }: HistoryTrackerProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      // Dans un premier temps, on va simuler l'historique
      // Plus tard, vous pourrez créer une table d'audit dans Supabase
      const mockHistory: HistoryItem[] = [
        {
          id: '1',
          document_id: documentId,
          user_id: user?.id || 'unknown',
          user_email: user?.email || 'unknown@example.com',
          user_name: profile?.full_name || 'Utilisateur',
          action: 'create',
          table_name: 'documents',
          record_id: documentId,
          description: 'Document créé',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          document_id: documentId,
          user_id: user?.id || 'unknown',
          user_email: user?.email || 'unknown@example.com',
          user_name: profile?.full_name || 'Utilisateur',
          action: 'update',
          table_name: 'document_columns',
          record_id: 'col-1',
          description: 'Colonne "Nom" ajoutée',
          created_at: new Date(Date.now() - 300000).toISOString()
        }
      ];

      setHistory(mockHistory);

      // Pour une vraie implémentation, décommentez ce code :
      /*
      const { data, error } = await supabase
        .from('document_audit_log')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
      */

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour logger une action (à appeler depuis les autres composants)
  const logAction = async (action: HistoryItem['action'], tableName: string, recordId: string, description: string, oldValues?: any, newValues?: any) => {
    if (!user) return;

    try {
      // Pour l'instant, on met à jour l'état local
      // Plus tard, vous pourrez sauvegarder dans Supabase
      const newHistoryItem: HistoryItem = {
        id: `hist_${Date.now()}`,
        document_id: documentId,
        user_id: user.id,
        user_email: user.email,
        user_name: profile?.full_name,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        description,
        created_at: new Date().toISOString()
      };

      setHistory(prev => [newHistoryItem, ...prev]);

      // Pour une vraie implémentation, décommentez ce code :
      /*
      await supabase
        .from('document_audit_log')
        .insert([{
          document_id: documentId,
          user_id: user.id,
          action,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues,
          new_values: newValues,
          description,
          created_at: new Date().toISOString()
        }]);
      */

    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const getActionIcon = (action: HistoryItem['action']) => {
    switch (action) {
      case 'create': return '🆕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'rename': return '🏷️';
      case 'permission_change': return '👥';
      default: return '📝';
    }
  };

  const getActionColor = (action: HistoryItem['action']) => {
    switch (action) {
      case 'create': return 'text-green-600 dark:text-green-400';
      case 'update': return 'text-blue-600 dark:text-blue-400';
      case 'delete': return 'text-red-600 dark:text-red-400';
      case 'rename': return 'text-purple-600 dark:text-purple-400';
      case 'permission_change': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <button
        onClick={() => setShowHistory(true)}
        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
      >
        <span>📋</span>
        <span>Historique</span>
      </button>

      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Historique des modifications
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {history.length} action(s) enregistrée(s)
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-lg mb-2">Aucun historique</p>
                  <p className="text-sm">Les modifications apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className={`text-2xl ${getActionColor(item.action)}`}>
                        {getActionIcon(item.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.description}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">
                            {item.user_name || item.user_email}
                          </span>
                          <span>•</span>
                          <span className="capitalize">
                            {item.action.replace('_', ' ')}
                          </span>
                          {item.table_name && (
                            <>
                              <span>•</span>
                              <span>{item.table_name}</span>
                            </>
                          )}
                        </div>

                        {/* Détails des changements */}
                        {(item.old_values || item.new_values) && (
                          <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                            {item.old_values && (
                              <div className="text-red-600 dark:text-red-400 line-through">
                                {JSON.stringify(item.old_values)}
                              </div>
                            )}
                            {item.new_values && (
                              <div className="text-green-600 dark:text-green-400">
                                {JSON.stringify(item.new_values)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <div>
                  Dernière mise à jour : {history[0] ? formatTime(history[0].created_at) : 'N/A'}
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook pour utiliser l'historique dans d'autres composants
export function useHistory(documentId: string) {
  const [historyTracker] = useState(() => HistoryTracker({ documentId }));

  const logAction = (
    action: HistoryItem['action'], 
    tableName: string, 
    recordId: string, 
    description: string, 
    oldValues?: any, 
    newValues?: any
  ) => {
    // Cette fonction sera appelée par les autres composants
    // Pour l'instant, c'est une simulation
    console.log('History log:', { action, tableName, recordId, description, oldValues, newValues });
  };

  return { logAction };
}