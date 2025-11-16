// app/users/components/users.client.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { POSConfig } from "../types/pos";
import { CreateUserModal } from "./components/create-user-modal";
import { ResCompany } from "../types/odoo";


export interface EnhancedUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'manager' | 'financier';
  assigned_shops: string[];
  assigned_companies: string[];
  shop_access_type: 'all' | 'specific';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  created_at_auth?: string;
  email_confirmed_at?: string;
  is_online?: boolean;
  phone?: string;
}

interface UsersClientProps {
  initialUsers: EnhancedUser[];
  shops: POSConfig[];
  companies: ResCompany[];
  search?: string;
  roleFilter?: string;
}

export default function UsersClient({
  initialUsers: users,
  shops,
  companies,
  search,
  roleFilter
}: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = (updates: { search?: string; role?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSearch = (value: string) => {
    handleFilterChange({ search: value });
  };

  const handleRoleFilter = (value: string) => {
    handleFilterChange({ role: value === 'all' ? undefined : value });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'financier':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'manager':
        return 'Manager';
      case 'financier':
        return 'Financier';
      default:
        return 'Utilisateur';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleUserCreated = () => {
    router.refresh() // Rafraîchir les données serveur
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </Link>
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des Utilisateurs
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Créez et gérez les accès utilisateurs de votre organisation
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs actifs</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {users.length} utilisateurs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Filtres et Actions */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Filtres */}
              <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
                {/* Recherche */}
                <div className="relative flex-1 min-w-64">
                  <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={search || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                </div>

                {/* Filtre par rôle */}
                <select 
                  value={roleFilter || 'all'}
                  onChange={(e) => handleRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-w-32"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="admin">Administrateurs</option>
                  <option value="manager">Managers</option>
                  <option value="financier">Financiers</option>
                  <option value="user">Utilisateurs</option>
                </select>
              </div>

              {/* Bouton d'action */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
              >
                <span>+</span>
                <span>Nouvel utilisateur</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des utilisateurs */}
        <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
            <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
              <span>Liste des Utilisateurs</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {users.length} utilisateur(s) trouvé(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-48">
                      Utilisateur
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-32">
                      Rôle
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-40">
                      Accès Boutiques
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-32">
                      Date de création
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-24">
                      Dernière connexion
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {users.map((user) => (
                    <tr 
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {user.full_name || 'Non renseigné'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {user.shop_access_type === 'all' ? (
                            <span className="text-green-600 dark:text-green-400">Toutes les boutiques</span>
                          ) : (
                            <span>{user.assigned_shops.length} boutique(s)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900 dark:text-white">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400">
                        {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Jamais'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setIsEditing(user.id)}
                            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
                                // Implémentez la suppression ici
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors duration-200"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* État vide */}
              {users.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {search ? "Aucun utilisateur trouvé" : "Aucun utilisateur"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                    {search 
                      ? "Aucun utilisateur ne correspond à votre recherche."
                      : "Commencez par créer votre premier utilisateur."
                    }
                  </p>
                  {!search && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      Créer un utilisateur
                    </button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de création (à implémenter) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Créer un nouvel utilisateur
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Fonctionnalité à implémenter - Intégration avec l&apos;authentification Supabase
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // Implémentez la création d'utilisateur ici
                  setIsCreateModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
        shops={shops}
        companies={companies}
      />
    </main>
  );
}