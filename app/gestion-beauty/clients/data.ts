// app/analyse-beauty/clients/data.ts
export interface PurchasedProduct {
  name: string;
  qty: number;
}

export interface BeautyClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: 'Gold' | 'Silver' | 'Pyiurs' | 'Normal';
  status: 'Actif' | 'Inactif' | 'Très inactif';
  totalSpent: number;
  lastPurchase: string;
  products: PurchasedProduct[];
}

export const MOCK_CLIENTS: BeautyClient[] = [
  { 
    id: '1', name: 'Marie Dupont', email: 'marie@example.com', phone: '+243 810 000 001',
    category: 'Gold', status: 'Actif', totalSpent: 1250, lastPurchase: '2025-01-28',
    products: [{ name: 'Sérum Vitamine C', qty: 3 }, { name: 'Crème Hydratante', qty: 1 }]
  },
  { 
    id: '2', name: 'Jean Kabamba', email: 'jean.k@telecom.cd', phone: '+243 990 000 002',
    category: 'Pyiurs', status: 'Actif', totalSpent: 3400, lastPurchase: '2025-01-30',
    products: [{ name: 'Parfum Nuit Noire', qty: 2 }, { name: 'Huile Barbe', qty: 5 }]
  },
  // ... ajouter d'autres mocks
];