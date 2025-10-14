// lib/users.ts
export interface User {
  id: string;
  username: string;
  password: string; // En production, utilisez des mots de passe hashés
  name: string;
  role: string;
}

// Liste des utilisateurs - en production, stockez ça dans une base de données
export const users: User[] = [
  {
    id: '1',
    username: 'admin',
    password: 'Tigo1515',
    name: 'Administrateur',
    role: 'admin'
  },
  {
    id: '2',
    username: 'manager24',
    password: 'PB24manger',
    name: 'Manager',
    role: 'manager'
  },
  {
    id: '3', 
    username: 'viewer',
    password: 'viewer123',
    name: 'Viewer',
    role: 'viewer'
  }
];

export function verifyUser(username: string, password: string): User | null {
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
}