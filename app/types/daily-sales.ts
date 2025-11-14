// types/daily-sales.ts
export interface EnrichedPOSLine {
  id: number;
  qty: number;
  product_id: [number, string];
  create_date: string;
  price_unit: number;
  order_id: [number, string];
  price_subtotal: number;
  product_name: string;
  product_category: string;
  product_price: number;
  total_amount: number;
  boutique_id: number | null;
  boutique_name: string;
}

export interface DailySaleData {
  id: string;
  date: string;
  boutique: string;
  totalSales: number;
  rentAmount: number;
  safeAmount: number;
  ceoAmount: number;
  beautyAmount: number;
  dailyGoal: number;
  progress: number;
}