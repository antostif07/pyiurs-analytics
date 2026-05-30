// app/purchases/mock-data.ts

export interface PurchaseItem {
  name: string;          // Famille d'achat ou Fournisseur
  today: number;         // Engagements du jour
  yesterday: number;     // Engagements J-1
  weekly: number;        // Cumul semaine
  mtd: number;           // Month to Date (cumul mois actuel)
  mtdPrev: number;       // Cumul mois précédent (M-1)
  budget: number;        // Budget alloué
  forecast: number;      // Prévisions de fin de mois
  pctBudget: number;     // % d'utilisation du budget
  deltaYoY?: number;     // Évolution annuelle N vs N-1
  weeks: Record<string, number>;
  subRows?: PurchaseItem[];
}

export const MOCK_PURCHASES_DATA = {
  // 1. Analyse par grandes familles d'achats et fournisseurs clés
  categoryPerformance: [
    {
      name: "IT & Services Cloud",
      today: 1450,
      yesterday: 2800,
      weekly: 12500,
      mtd: 48500,
      mtdPrev: 45000,
      budget: 55000,
      forecast: 52000,
      pctBudget: 88,
      weeks: { "Semaine 1": 12000, "Semaine 2": 13500, "Semaine 3": 15000, "Semaine 4": 8000 },
      subRows: [
        { name: "Amazon Web Services", mtd: 28000, mtdPrev: 25000, forecast: 30000, pctBudget: 93, weeks: { "Semaine 1": 7000, "Semaine 2": 7500, "Semaine 3": 8000, "Semaine 4": 5500 } },
        { name: "Microsoft Enterprise", mtd: 12500, mtdPrev: 13000, forecast: 13000, pctBudget: 96, weeks: { "Semaine 1": 3000, "Semaine 2": 4000, "Semaine 3": 4000, "Semaine 4": 1500 } },
        { name: "SaaS & Licences diverses", mtd: 8000, mtdPrev: 7000, forecast: 9000, pctBudget: 67, weeks: { "Semaine 1": 2000, "Semaine 2": 2000, "Semaine 3": 3000, "Semaine 4": 1000 } }
      ]
    },
    {
      name: "Prestations & Conseil",
      today: 0,
      yesterday: 1500,
      weekly: 8000,
      mtd: 32000,
      mtdPrev: 38000,
      budget: 40000,
      forecast: 35000,
      pctBudget: 80,
      weeks: { "Semaine 1": 10000, "Semaine 2": 9000, "Semaine 3": 8000, "Semaine 4": 5000 },
      subRows: [
        { name: "Cabinet Audit McKinsey", mtd: 20000, mtdPrev: 25000, forecast: 20000, pctBudget: 100, weeks: { "Semaine 1": 6000, "Semaine 2": 6000, "Semaine 3": 5000, "Semaine 4": 3000 } },
        { name: "Développeurs Freelances", mtd: 12000, mtdPrev: 13000, forecast: 15000, pctBudget: 60, weeks: { "Semaine 1": 4000, "Semaine 2": 3000, "Semaine 3": 3000, "Semaine 4": 2000 } }
      ]
    },
    {
      name: "Marketing & Médias",
      today: 800,
      yesterday: 3100,
      weekly: 9400,
      mtd: 27500,
      mtdPrev: 22000,
      budget: 30000,
      forecast: 29500,
      pctBudget: 91,
      weeks: { "Semaine 1": 6000, "Semaine 2": 7500, "Semaine 3": 8000, "Semaine 4": 6000 },
      subRows: [
        { name: "Google Ads & Social Media", mtd: 18500, mtdPrev: 15000, forecast: 20000, pctBudget: 92, weeks: { "Semaine 1": 4000, "Semaine 2": 5000, "Semaine 3": 5500, "Semaine 4": 4000 } },
        { name: "Agence de Presse", mtd: 9000, mtdPrev: 7000, forecast: 9500, pctBudget: 90, weeks: { "Semaine 1": 2000, "Semaine 2": 2500, "Semaine 3": 2500, "Semaine 4": 2000 } }
      ]
    },
    {
      name: "Frais Généraux & Logistique",
      today: 350,
      yesterday: 200,
      weekly: 1800,
      mtd: 8900,
      mtdPrev: 9500,
      budget: 12000,
      forecast: 10500,
      pctBudget: 74,
      weeks: { "Semaine 1": 2500, "Semaine 2": 2200, "Semaine 3": 2400, "Semaine 4": 1800 },
      subRows: [
        { name: "Fournitures (Lyreco)", mtd: 3100, mtdPrev: 3500, forecast: 3500, pctBudget: 88, weeks: { "Semaine 1": 800, "Semaine 2": 800, "Semaine 3": 900, "Semaine 4": 600 } },
        { name: "Déplacements & Voyages", mtd: 5800, mtdPrev: 6000, forecast: 7000, pctBudget: 68, weeks: { "Semaine 1": 1700, "Semaine 2": 1400, "Semaine 3": 1500, "Semaine 4": 1200 } }
      ]
    }
  ],
  // 2. Analyse par Départements demandeurs (Cost Centers)
  departmentPerformance: [
    {
      name: "Département Technologie & R&D",
      weeks: { "Semaine 1": 15000, "Semaine 2": 16000, "Semaine 3": 17000, "Semaine 4": 11000 },
      mtd: 59000,
      mtdPrev: 55000,
      forecast: 65000,
      pctBudget: 90
    },
    {
      name: "Département Marketing & Com",
      weeks: { "Semaine 1": 8000, "Semaine 2": 9500, "Semaine 3": 10500, "Semaine 4": 8000 },
      mtd: 36000,
      mtdPrev: 30000,
      forecast: 38000,
      pctBudget: 94
    },
    {
      name: "Département Ressources Humaines",
      weeks: { "Semaine 1": 5000, "Semaine 2": 5200, "Semaine 3": 5000, "Semaine 4": 4000 },
      mtd: 19200,
      mtdPrev: 21000,
      forecast: 20000,
      pctBudget: 80
    }
  ]
};