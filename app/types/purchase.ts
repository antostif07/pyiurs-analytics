export type PurchaseOrderLine = {
  id: number;
  name: string;
  product_id: [number, string]; // Tuple of [id, name]
  product_qty: number;
  price_unit: number;
  price_subtotal: number;
  qty_received: number;
  order_id: [number, string]; // Tuple of [id, name]
};