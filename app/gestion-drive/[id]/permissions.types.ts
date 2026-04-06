// 🔐 Actions possibles
export type PermissionAction = 'read' | 'write' | 'delete';

// 👤 Qui peut recevoir une permission
export type PermissionRole = 
  | 'all'              // tout le monde (public)
  | 'authenticated'   // utilisateurs connectés
  | string;           // userId spécifique

// 📄 Structure du JSON default_permissions
export type DocumentPermissions = {
  read?: PermissionRole[];
  write?: PermissionRole[];
  delete?: PermissionRole[];
};