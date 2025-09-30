export type POSOrderLine = {
  id: number;
  product_id: [number, string]; // Tuple of [id, name]
  qty: number;
  price_unit: number;
  price_subtotal: number;
  price_subtotal_incl: number;
  discount: number;
  order_id: [number, string]; // Tuple of [id, name]
  create_date: string; // ISO date string
};

export type POSOrder = {
  id: number;
  name: string;
  date_order: string; // ISO date string
  amount_total: number;
  amount_tax: number;
  amount_paid: number;
  amount_return: number;
  session_id: [number, string]; // Tuple of [id, name]
  lines: POSOrderLine[];
};

export type POSSession = {
  id: number;
  name: string;
  start_at: string; // ISO date string
  stop_at: string | null; // ISO date string or null if session is still open
  state: "opened" | "closed" | "closing_control" | "draft";
  user_id: [number, string]; // Tuple of [id, name]
  config_id: [number, string]; // Tuple of [id, name]
};

export type POSConfig = {
  id: number;
  name: string;
  journal_id: [number, string]; // Tuple of [id, name]
  pricelist_id: [number, string]; // Tuple of [id, name]
  company_id: [number, string]; // Tuple of [id, name]
  currency_id: [number, string]; // Tuple of [id, name]
  user_id: [number, string]; // Tuple of [id, name]
};

export type POSPayment = {
  id: number;
  amount: number;
  payment_date: string; // ISO date string
  payment_method_id: [number, string]; // Tuple of [id, name]
  order_id: [number, string]; // Tuple of [id, name]
};

export type POSPaymentMethod = {
  id: number;
  name: string;
  code: string;
  journal_id: [number, string]; // Tuple of [id, name]
};

export type POSCustomer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  country_id: [number, string]; // Tuple of [id, name]
};