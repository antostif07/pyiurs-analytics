// app/finance/revenue/types.ts
export interface WeeklyRevenue {
  boutique: string;
  weeks: { [key: string]: number }; // ex: { "W18": 1188, "W19": 3070 }
}

export interface AdvancedRevenue {
  boutique: string;
  deltaWoW: number;    // Δ WoW
  mtd: number;         // Month To Date
  mtdPrev: number;     // MTD-1
  deltaMoM: number;    // Δ MoM
  pyMtd: number;       // Previous Year MTD
  forecast: number;    // Prévision
  budgetMensuel: number; // BUM
  pctBudget: number;    // % BU
  ytd: number;         // Year To Date
  ytdPrev: number;     // YTD-1
  deltaYoY: number;    // Δ YoY
  budgetAnnuel: number; // BU Annuel
  pctBudgetA: number;   // % BU A
}