export // Interface pour les données de revenus
interface RevenueData {
  dailySales: {
    amount: number;
    budget: number;
    percentage: number;
  };
  previousDaySales: {
    amount: number;
    budget: number;
    percentage: number;
  };
  weeklySales: {
    amount: number;
    budget: number;
    percentage: number;
  };
  monthlySales: {
    amount: number;
    budget: number;
    percentage: number;
  };
  boutiqueRevenue: {
    headers: string[];
    rows: {
      boutique: string;
      values: number[];
    }[];
    total: number[];
  };
  boutiquePerformance: {
    headers: string[];
    rows: {
      boutique: string;
      wow: number;
      mtd: number;
      mtd1: number;
      aMon: number;
      pvMtd: number;
      forecast: number;
      buM: number;
      percentageBU: number;
      ytd1: number;
      aYoy: number;
      buAnnuel: number;
      percentageBUA: number;
    }[];
  };
  segmentRevenue: {
    headers: string[];
    rows: {
      segment: string;
      values: number[];
    }[];
    total: number[];
  };
  segmentPerformance: {
    headers: string[];
    rows: {
      segment: string;
      wow: number;
      mtd: number;
      mtd1: number;
      aMon: number;
      pvMtd: number;
      forecast: number;
      buM: number;
      percentageBU: number;
      ytd1: number;
      aYoy: number;
      buAnnuel: number;
      percentageBUA: number;
    }[];
  };
}