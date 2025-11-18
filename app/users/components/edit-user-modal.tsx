// app/users/components/edit-user-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { ResCompany } from '@/app/types/odoo'
import { POSConfig } from '@/app/types/pos'
import { EnhancedUser } from '../users.client'

interface EditUserModalProps {
  user: EnhancedUser
  isOpen: boolean
  onClose: () => void
  onUserUpdated: () => void
  shops: POSConfig[]
  companies: ResCompany[]
}

interface UserFormData {
  email: string
  full_name: string
  role: 'admin' | 'user' | 'manager' | 'financier' | 'sales' | 'logistic'
  shop_access_type: 'all' | 'specific'
  assigned_shops: string[]
  assigned_companies: number[]
  is_active: boolean
}

export function EditUserModal({ user, isOpen, onClose, onUserUpdated, shops, companies }: EditUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    email: user.email,
    full_name: user.full_name || '',
    role: user.role,
    shop_access_type: user.shop_access_type,
    assigned_shops: user.assigned_shops || [],
    assigned_companies: user.assigned_companies || [],
    is_active: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mettre à jour le formData quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name || '',
        role: user.role,
        shop_access_type: user.shop_access_type,
        assigned_shops: user.assigned_shops || [],
        assigned_companies: user.assigned_companies || [],
        is_active: true
      })
    }
  }, [user])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'L\'email est requis'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide'
    }

    if (!formData.full_name) {
      newErrors.full_name = 'Le nom complet est requis'
    }

    if (formData.shop_access_type === 'specific' && formData.assigned_shops.length === 0) {
      newErrors.assigned_shops = 'Au moins une boutique doit être sélectionnée'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la modification de l\'utilisateur')
      }

      const updatedUser = await response.json()
      
      setErrors({})
      onUserUpdated()
      onClose()
      
    } catch (error) {
      console.error('Erreur modification utilisateur:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Une erreur est survenue' })
    } finally {
      setLoading(false)
    }
  }

  const handleShopToggle = (shopId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_shops: prev.assigned_shops.includes(shopId)
        ? prev.assigned_shops.filter(id => id !== shopId)
        : [...prev.assigned_shops, shopId]
    }))
  }

  const handleCompanyToggle = (companyId: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_companies: prev.assigned_companies.includes(companyId)
        ? prev.assigned_companies.filter(id => id !== companyId)
        : [...prev.assigned_companies, companyId]
    }))
  }

  const handleResetPassword = async () => {
    if (!confirm('Êtes-vous sûr de vouloir envoyer un email de réinitialisation de mot de passe à cet utilisateur ?')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'email de réinitialisation')
      }

      alert('Email de réinitialisation envoyé avec succès')
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error)
      alert(error instanceof Error ? error.message : 'Une erreur est survenue')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Modifier l'utilisateur
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informations de l'utilisateur */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">
                {user.full_name || 'Non renseigné'}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {user.email}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600 dark:bg-slate-700'
                }`}
                placeholder="email@exemple.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.full_name 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600 dark:bg-slate-700'
                }`}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.full_name}</p>
              )}
            </div>
          </div>

          {/* Rôle et accès */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rôle *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  role: e.target.value as 'admin' | 'user' | 'manager' | 'financier'
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
              >
                <option value="user">Utilisateur</option>
                <option value="manager">Manager</option>
                <option value="financier">Financier</option>
                <option value="admin">Administrateur</option>
                <option value="sales">Vendeur</option>
                <option value="logistic">Logistique</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type d'accès boutique *
              </label>
              <select
                value={formData.shop_access_type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  shop_access_type: e.target.value as 'all' | 'specific'
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
              >
                <option value="specific">Boutiques spécifiques</option>
                <option value="all">Toutes les boutiques</option>
              </select>
            </div>
          </div>

          {/* Boutiques assignées */}
          {formData.shop_access_type === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Boutiques assignées *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                {shops.map((shop) => (
                  <label key={shop.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.assigned_shops.includes(shop.id.toString())}
                      onChange={() => handleShopToggle(shop.id.toString())}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{shop.name}</span>
                  </label>
                ))}
              </div>
              {errors.assigned_shops && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.assigned_shops}</p>
              )}
            </div>
          )}

          {/* Entreprises assignées */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entreprises assignées
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
              {companies.map((company) => (
                <label key={company.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.assigned_companies.includes(company.id)}
                    onChange={() => handleCompanyToggle(company.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{company.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions supplémentaires */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Actions supplémentaires
            </h4>
            <button
              type="button"
              onClick={handleResetPassword}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors text-sm"
            >
              Envoyer une réinitialisation de mot de passe
            </button>
          </div>

          {/* Erreur générale */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded transition-colors flex items-center space-x-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{loading ? 'Modification...' : 'Modifier l\'utilisateur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}