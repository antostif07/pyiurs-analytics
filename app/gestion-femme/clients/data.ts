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