// lib/supabase/module-service.ts
import { supabase } from '@/lib/supabase'
import { Module } from '@/lib/users'

export class ModuleService {
  // Récupérer tous les modules
  static async getAllModules(): Promise<Module[]> {
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching modules:', error)
      return []
    }

    return modules || []
  }

  // Récupérer les modules accessibles pour un utilisateur
  static async getUserModules(userId: string): Promise<Module[]> {
    // Récupérer les permissions de l'utilisateur
    const { data: userPermissions, error: permError } = await supabase
      .from('user_permissions')
      .select('permission_path')
      .eq('user_id', userId)

    if (permError) {
      console.error('Error fetching user permissions:', permError)
      return []
    }

    const permissionPaths = userPermissions?.map(up => up.permission_path) || []

    // Si l'utilisateur a la permission 'all', retourner tous les modules
    if (permissionPaths.includes('all')) {
      return await this.getAllModules()
    }

    // Sinon, retourner seulement les modules autorisés
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .in('href', permissionPaths)
      .order('name')

    if (error) {
      console.error('Error fetching user modules:', error)
      return []
    }

    return modules || []
  }

  // Récupérer les modules par rôle
  static async getModulesByRole(role: string): Promise<Module[]> {
    const { data: rolePermissions, error } = await supabase
      .from('role_permissions')
      .select('module_href')
      .eq('role', role)

    if (error) {
      console.error('Error fetching role permissions:', error)
      return []
    }

    const moduleHrefs = rolePermissions?.map(rp => rp.module_href) || []

    const { data: modules, error: moduleError } = await supabase
      .from('modules')
      .select('*')
      .in('href', moduleHrefs)
      .order('name')

    if (moduleError) {
      console.error('Error fetching modules by role:', moduleError)
      return []
    }

    return modules || []
  }
}