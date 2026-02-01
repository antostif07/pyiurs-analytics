export interface IndividualProductModel {
  id: number;
  name: string;
  productVariantId: number;
  listPrice: number;
  brand: string;
  color: string;
  
  // Stocks par Boutique
  stock_P24: number;
  stock_ktm: number;
  stock_mto: number;
  stock_onl: number;
  stock_dc: number;
  stock_lmb: number;
  stock_other: number;
  total_stock: number;

  // Métriques
  sales_last_30_days: number;
  product_qty: number;   // Quantité commandée (Achat)
  qty_received: number;  // Quantité reçue (Achat)
  qty_sold: number;      // Ventes totales (si disponible)
  
  last_sale_date?: Date;
  parent_hs_code: string;
}

export interface ControlStockBeautyModel {
  hs_code: string;
  name: string;
  brand: string;
  color: string;
  
  // Stocks Agrégés
  qty_available: number;
  stock_P24: number;
  stock_ktm: number;
  stock_mto: number;
  stock_onl: number;
  stock_dc: number;
  stock_other: number;
  total_stock: number;

  // Métriques Agrégées
  sales_last_30_days: number;
  daily_sales_rate: number;
  days_until_out_of_stock: number;
  
  // Achats
  product_qty: number;
  qty_received: number;
  not_received: number;
  qty_sold: number;

  // UX & Détails
  isExpanded: boolean;
  individualProducts: IndividualProductModel[];

  // Dates (Optionnelles)
  estimated_out_of_stock_date?: Date;
  recommended_reorder_date?: Date;
  last_sale_date?: Date;
}