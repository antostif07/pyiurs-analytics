export type ControlStockBeautyModel = {
  hs_code: string;
  name: string;
  product_qty: number;
  qty_received: number;
  not_received: number;
  qty_sold?: number;
  qty_available: number;
};