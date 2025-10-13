// types/ControlStockBeautyModel.ts
export interface ControlStockBeautyModel {
  hs_code: string;
  name: string;
  brand: string;
  color: string;
  product_qty: number;
  qty_received: number;
  not_received: number;
  qty_sold: number;
  qty_available: number;
  stock_P24?: number;
  stock_ktm?: number;
  stock_mto?: number;
  stock_onl?: number;
  stock_dc?: number;
  stock_other?: number;
  total_stock?: number;
  sales_last_30_days?: number;    // Ventes sur 30 jours
  daily_sales_rate?: number;      // Ratio quotidien (ventes30Jours / 30)
  days_until_out_of_stock?: number; // Jours restants avant rupture
  estimated_out_of_stock_date?: Date; // Date estimée de rupture
  recommended_reorder_date?: Date; // Date recommandée de commande
  last_sale_date?: Date;

  isExpanded?: boolean;
  individualProducts?: IndividualProductModel[];
}

export interface IndividualProductModel {
  id: number;
  name: string;
  productVariantId: number;
  listPrice: number;
  brand: string;
  color: string;
  
  // Stocks individuels par boutique
  stock_P24: number;
  stock_ktm: number;
  stock_mto: number;
  stock_onl: number;
  stock_dc: number;
  stock_other: number;
  total_stock: number;
  
  // Métriques individuelles
  sales_last_30_days: number;
  last_sale_date?: Date;
  
  // Référence au parent
  parent_hs_code: string;
}