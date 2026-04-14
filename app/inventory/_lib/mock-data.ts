// Mock data for the Stock Management Dashboard

export type StockMovement = {
  date: string;
  incoming: number;
  outgoing: number;
  cumulative: number;
};

export type ShopStock = {
  id: string;
  shop: string;
  category: string;
  product: string;
  openingStock: number;
  incomingStock: number;
  outgoingStock: number;
  currentStock: number;
  stockValue: number;
  history: StockMovement[];
};

export type Alert = {
  id: string;
  type: "low" | "overstock" | "unusual" | "inactive";
  shop: string;
  product: string;
  message: string;
  severity: "critical" | "warning" | "info";
};

export type AuditLog = {
  id: string;
  user: string;
  role: "Admin" | "Manager";
  action: string;
  shop: string;
  timestamp: string;
};

// Generate time series data for the last 30 days
function generateSeries(days: number): StockMovement[] {
  const result: StockMovement[] = [];
  let cumulative = 1200;
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const incoming = Math.floor(Math.random() * 120 + 20);
    const outgoing = Math.floor(Math.random() * 100 + 10);
    cumulative += incoming - outgoing;
    result.push({
      date: d.toISOString().slice(0, 10),
      incoming,
      outgoing,
      cumulative,
    });
  }
  return result;
}

export const STOCK_SERIES_30D: StockMovement[] = generateSeries(30);
export const STOCK_SERIES_7D: StockMovement[] = STOCK_SERIES_30D.slice(-7);
export const STOCK_SERIES_1D: StockMovement[] = STOCK_SERIES_30D.slice(-1);

export const SHOP_STOCK_DATA: ShopStock[] = [
  {
    id: "1",
    shop: "Shop Alpha",
    category: "Electronics",
    product: "Wireless Headphones",
    openingStock: 320,
    incomingStock: 180,
    outgoingStock: 145,
    currentStock: 355,
    stockValue: 42600,
    history: generateSeries(10),
  },
  {
    id: "2",
    shop: "Shop Alpha",
    category: "Electronics",
    product: "USB-C Cables",
    openingStock: 800,
    incomingStock: 400,
    outgoingStock: 620,
    currentStock: 580,
    stockValue: 8700,
    history: generateSeries(10),
  },
  {
    id: "3",
    shop: "Shop Beta",
    category: "Apparel",
    product: "Running Shoes",
    openingStock: 210,
    incomingStock: 90,
    outgoingStock: 180,
    currentStock: 120,
    stockValue: 14400,
    history: generateSeries(10),
  },
  {
    id: "4",
    shop: "Shop Beta",
    category: "Apparel",
    product: "Sports T-Shirts",
    openingStock: 560,
    incomingStock: 240,
    outgoingStock: 280,
    currentStock: 520,
    stockValue: 7800,
    history: generateSeries(10),
  },
  {
    id: "5",
    shop: "Shop Gamma",
    category: "Home & Garden",
    product: "Smart LED Bulbs",
    openingStock: 150,
    incomingStock: 300,
    outgoingStock: 60,
    currentStock: 390,
    stockValue: 11700,
    history: generateSeries(10),
  },
  {
    id: "6",
    shop: "Shop Gamma",
    category: "Home & Garden",
    product: "Air Purifier",
    openingStock: 45,
    incomingStock: 20,
    outgoingStock: 38,
    currentStock: 27,
    stockValue: 32400,
    history: generateSeries(10),
  },
  {
    id: "7",
    shop: "Shop Delta",
    category: "Food & Beverages",
    product: "Protein Powder",
    openingStock: 400,
    incomingStock: 200,
    outgoingStock: 360,
    currentStock: 240,
    stockValue: 14400,
    history: generateSeries(10),
  },
  {
    id: "8",
    shop: "Shop Delta",
    category: "Food & Beverages",
    product: "Energy Drinks",
    openingStock: 1200,
    incomingStock: 800,
    outgoingStock: 950,
    currentStock: 1050,
    stockValue: 10500,
    history: generateSeries(10),
  },
];

export const ALERTS: Alert[] = [
  {
    id: "a1",
    type: "low",
    shop: "Shop Gamma",
    product: "Air Purifier",
    message: "Stock level at 27 units — below minimum threshold of 30",
    severity: "critical",
  },
  {
    id: "a2",
    type: "low",
    shop: "Shop Beta",
    product: "Running Shoes",
    message: "Running Shoes at 120 units — projected stockout in 4 days",
    severity: "warning",
  },
  {
    id: "a3",
    type: "overstock",
    shop: "Shop Gamma",
    product: "Smart LED Bulbs",
    message: "Smart LED Bulbs at 390 units — 3x above optimal level",
    severity: "warning",
  },
  {
    id: "a4",
    type: "unusual",
    shop: "Shop Alpha",
    product: "USB-C Cables",
    message: "Outgoing stock spiked 82% above 7-day average",
    severity: "info",
  },
];

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "l1",
    user: "Sarah Chen",
    role: "Admin",
    action: "Adjusted incoming stock +200 units",
    shop: "Shop Alpha",
    timestamp: "2026-04-10T09:14:00Z",
  },
  {
    id: "l2",
    user: "James Park",
    role: "Manager",
    action: "Marked 38 units as outgoing",
    shop: "Shop Beta",
    timestamp: "2026-04-10T08:55:00Z",
  },
  {
    id: "l3",
    user: "Maria Lopez",
    role: "Manager",
    action: "Updated category → Home & Garden",
    shop: "Shop Gamma",
    timestamp: "2026-04-09T17:32:00Z",
  },
  {
    id: "l4",
    user: "Sarah Chen",
    role: "Admin",
    action: "Exported stock report (PDF)",
    shop: "All Shops",
    timestamp: "2026-04-09T15:00:00Z",
  },
];

export const SHOP_DISTRIBUTION = [
  { name: "Shop Alpha", value: 935, color: "#6366f1" },
  { name: "Shop Beta", value: 640, color: "#22d3ee" },
  { name: "Shop Gamma", value: 417, color: "#f59e0b" },
  { name: "Shop Delta", value: 1290, color: "#10b981" },
];

export const AI_INSIGHTS = [
  {
    id: "i1",
    icon: "trending-up",
    color: "green",
    text: "Total stock increased by 18% compared to last week across all shops.",
  },
  {
    id: "i2",
    icon: "store",
    color: "blue",
    text: "Shop Delta contributes 39% of total inventory — highest among all shops.",
  },
  {
    id: "i3",
    icon: "alert-triangle",
    color: "red",
    text: "Air Purifier (Shop Gamma) is at risk of stockout within 3 days at current velocity.",
  },
  {
    id: "i4",
    icon: "package",
    color: "yellow",
    text: "Smart LED Bulbs category shows overstock — consider redistributing to Shop Alpha.",
  },
];
