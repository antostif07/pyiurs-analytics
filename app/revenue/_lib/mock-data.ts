// app/dashboard/arpu/_lib/mock-data.ts

export const ARPU_METADATA = {
  segments: ["Enterprise", "Professional", "Starter", "Free Trial"],
  regions: ["EMEA", "Americas", "APAC"],
  currencies: ["EUR", "USD", "GBP"]
};

export const ARPU_KPI_DATA = {
  globalArpu: 84.50,
  arpuTrend: 12.4,
  mrr: 450200,
  mrrTrend: 8.2,
  activeUsers: 5328,
  usersTrend: -2.1, // Si les users baissent mais le MRR monte, l'ARPU explose
  ltv: 1240, // Lifetime Value
  ltvTrend: 5.4
};

export const ARPU_CHART_DATA = [
  { date: "2024-01", arpu: 72, revenue: 380000, users: 5277 },
  { date: "2024-02", arpu: 75, revenue: 405000, users: 5400 },
  { date: "2024-03", arpu: 74, revenue: 410000, users: 5540 },
  { date: "2024-04", arpu: 79, revenue: 430000, users: 5443 },
  { date: "2024-05", arpu: 82, revenue: 445000, users: 5426 },
  { date: "2024-06", arpu: 84.5, revenue: 450200, users: 5328 },
];

export const SEGMENT_PERFORMANCE = [
  { name: "Enterprise", arpu: 450.00, users: 450, growth: +15, color: "#6366f1" },
  { name: "Professional", arpu: 85.00, users: 1850, growth: +5, color: "#8b5cf6" },
  { name: "Starter", arpu: 29.00, users: 3028, growth: -2, color: "#ec4899" },
];

export const REGIONAL_BREAKDOWN = [
  { region: "EMEA", arpu: 92.40, users: 2100, mrr: 194040 },
  { region: "Americas", arpu: 105.10, users: 1800, mrr: 189180 },
  { region: "APAC", arpu: 48.20, users: 1428, mrr: 68829 },
];