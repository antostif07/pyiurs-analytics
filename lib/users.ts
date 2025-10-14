// lib/users.ts
export interface User {
  id: string;
  username: string;
  password: string; // En production, utilisez des mots de passe hashés
  name: string;
  role: string;
  permissions: string[];
}

// Liste des utilisateurs - en production, stockez ça dans une base de données
export const users: User[] = [
  {
    id: '1',
    username: ' ',
    password: 'Tigo1515',
    name: 'Administrateur',
    role: 'admin',
    permissions: ["all"],
  },
  {
    id: '2',
    username: 'manager_beauty',
    password: 'BeautyManager24',
    name: 'Manager Beauty',
    role: 'manager',
    permissions: [
    //   '/manager-kpis',
      '/control-revenue-beauty',
      '/control-stock-beauty',
    //   '/control-stock-femme',
    //   '/client-base',
      '/client-base-beauty',
    //   '/parc-client'
    ]
  },
  {
    id: '3',
    username: 'manager_marketing',
    password: 'martkPyiurs2',
    name: 'Marketing Manager',
    role: 'manager',
    permissions: [
    //   '/manager-kpis',
    //   '/control-revenue-beauty',
      '/control-stock-beauty',
      '/control-stock-femme',
      '/client-base',
      '/client-base-beauty',
      '/parc-client'
    ]
  },
];

export function verifyUser(username: string, password: string): User | null {
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
}

export function hasPermission(user: User, path: string): boolean {
  if (user.permissions.includes('all')) {
    return true;
  }
  
  return user.permissions.includes(path);
}