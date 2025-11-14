// lib/users.ts
export interface User {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: string;
  assigned_shop: string[] | 'all';
  created_at: string;
  updated_at: string;
}

export interface UserWithPermissions extends User {
  permissions: string[];
  user_permissions?: { permission_path: string }[];
}

export interface Module {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  href: string;
  description?: string;
}

export interface Shop {
  id: string;
  name: string;
  code: string;
  type: string;
}

// Liste des utilisateurs - en production, stockez ça dans une base de données
// export const users: User[] = [
//   {
//     id: '1',
//     username: 'admin',
//     password: 'Tigo1515',
//     name: 'Administrateur',
//     role: 'admin',
//     permissions: ["all"],
//     assignedShop: 'all', 
//   },
//   {
//     id: '2',
//     username: 'manager_beauty',
//     password: 'BeautyManager24',
//     name: 'Manager Beauty',
//     role: 'manager',
//     permissions: [
//     //   '/manager-kpis',
//       '/control-revenue-beauty',
//       '/control-stock-beauty',
//     //   '/control-stock-femme',
//     //   '/client-base',
//       '/client-base-beauty',
//       // '/cloture-vente'
//     ]
//   },
//   {
//     id: '3',
//     username: 'manager_marketing',
//     password: 'martkPyiurs2',
//     name: 'Marketing Manager',
//     role: 'manager',
//     permissions: [
//     //   '/manager-kpis',
//     //   '/control-revenue-beauty',
//       '/control-stock-beauty',
//       '/control-stock-femme',
//       '/client-base',
//       '/client-base-beauty',
//       '/parc-client'
//     ]
//   },
//   {
//     id: '4',
//     username: 'full_manager',
//     password: 'fullManager3',
//     name: 'Full Manager',
//     role: 'manager',
//     permissions: [
//       '/funds'
//     ]
//   },
//   {
//     id: '5',
//     username: 'manager_24',
//     password: 'manager_24',
//     name: 'Manager 24',
//     role: 'manager',
//     permissions: [
//       '/cloture-vente'
//     ],
//     assignedShop: ['1'],
//   },
//   {
//     id: '6',
//     username: 'manager_ktm',
//     password: 'manager_kmt',
//     name: 'Manager KTM',
//     role: 'manager',
//     permissions: [
//       '/cloture-vente'
//     ],
//     assignedShop: ['14'],
//   },
//   {
//     id: '7',
//     username: 'manager_mto',
//     password: 'manager_mto',
//     name: 'Manager MTO',
//     role: 'manager',
//     permissions: [
//       '/cloture-vente'
//     ],
//     assignedShop: ['15'],
//   },

//   {
//     id: 'o',
//     username: 'financier',
//     password: 'financier123',
//     name: 'Financier',
//     role: 'admin',
//     permissions: [
//       '/cloture-vente'
//     ],
//     assignedShop: 'all', 
//   },
// ];

// export function verifyUser(username: string, password: string): User | null {
//   const user = users.find(u => u.username === username && u.password === password);
//   return user || null;
// }

// export function hasPermission(user: User, path: string): boolean {
//   if (user.permissions.includes('all')) {
//     return true;
//   }
  
//   return user.permissions.includes(path);
// }