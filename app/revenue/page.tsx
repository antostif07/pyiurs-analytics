import { POSOrderLine } from "../types/pos";
import { RevenueData } from "../types/revenue";
import RevenueClient from "./revenue.client";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    boutique?: string;
  }>;
}

async function getPOSOrderLines(month?: string, year?: string) {
    const m = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
    const y = year || new Date().getFullYear().toString();
    
    const date = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    
    const domain = `[["create_date", ">=", "${date} 00:01:00"], ["create_date", "<=", "${y}-${m}-${lastDay} 23:59:59"]]`;

    const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,name,product_id,price_unit,full_product_name,order_id,create_date&domain=${domain}`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Lignes de commande POS");
  }

  return res.json();
}

async function getRevenueData(month?: string, year?: string): Promise<RevenueData> {
    const posOrderLines = await getPOSOrderLines(month, year);
    const dailySales = posOrderLines.records.filter((line: POSOrderLine) => {
        const lineDate = new Date(line.create_date);
        const today = new Date();
        return lineDate.getDate() === today.getDate() &&
               lineDate.getMonth() === today.getMonth() &&
               lineDate.getFullYear() === today.getFullYear();
    }).reduce((sum: number, line: POSOrderLine) => sum + (line.price_unit * line.qty), 0);

    const previousDaySales = posOrderLines.records.filter((line: POSOrderLine) => {
        const lineDate = new Date(line.create_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return lineDate.getDate() === yesterday.getDate() &&
               lineDate.getMonth() === yesterday.getMonth() &&
               lineDate.getFullYear() === yesterday.getFullYear();
        }).reduce((sum: number, line: POSOrderLine) => sum + (line.price_unit * line.qty), 0);
    const monthlySales = posOrderLines.records.reduce((sum: number, line: POSOrderLine) => sum + (line.price_unit * line.qty), 0);
    
  // Simulation des données - à remplacer par votre API
  const mockData: RevenueData = {
    dailySales: {
      amount: dailySales,
      budget: 0,
      percentage: 0
    },
    previousDaySales: {
      amount: previousDaySales,
      budget: 0,
      percentage: 0
    },
    weeklySales: {
      amount: 6664,
      budget: 17419,
      percentage: 38
    },
    monthlySales: {
      amount: monthlySales,
      budget: 75482,
      percentage: 36
    },
    boutiqueRevenue: {
      headers: ["Boutique", "W31", "W32", "W33", "W34", "W35"],
      rows: [
        { boutique: "P24", values: [644, 3797.5, 2872, 3483, 2501] },
        { boutique: "P.KTM", values: [178, 1151, 1909, 1331, 1461] },
        { boutique: "P.LMB", values: [442, 1935, 1633, 1532, 457] },
        { boutique: "P.MTO", values: [107, 272, 173, 0, 0] },
        { boutique: "ZARINA", values: [95, 235, 130, 145, 410] }
      ],
      total: [1359, 7225.5, 6816, 6664, 4829]
    },
    boutiquePerformance: {
      headers: ["Boutique", "A WOW", "MTD", "MTD-1", "A MON", "PV-MTD", "Forecast", "BU/M", "% BU", "YTD-1", "A YOY", "BU Annuel", "% BU/A"],
      rows: [
        { boutique: "ZARINA", wow: 183, mtd: 500, mtd1: 1970, aMon: -9, pvMtd: 1130, forecast: 722, buM: Infinity, percentageBU: 0, ytd1: 2470, aYoy: 3263, buAnnuel: Infinity, percentageBUA: -23 },
        { boutique: "P.MTO", wow: 70, mtd: 4802, mtd1: 8785, aMon: -45, pvMtd: 8380, forecast: 6905, buM: 9015, percentageBU: 53, ytd1: 61150, aYoy: 43454, buAnnuel: 126668, percentageBUA: -86 },
        { boutique: "P.KTM", wow: 10, mtd: 4149, mtd1: 6866, aMon: -40, pvMtd: 8131, forecast: 5795, buM: 8404, percentageBU: 49, ytd1: 61060, aYoy: 61831, buAnnuel: 118280, percentageBUA: -52 },
        { boutique: "P24", wow: 28, mtd: 9156, mtd1: 18282, aMon: -50, pvMtd: 32891, forecast: 13225, buM: 46839, percentageBU: 20, ytd1: 170067, aYoy: 275138, buAnnuel: 645853, percentageBUA: -26 },
        { boutique: "PONL", wow: 36, mtd: 494, mtd1: 1516, aMon: 67, pvMtd: 3785, forecast: 714, buM: 3403, percentageBU: 19, ytd1: 6805, aYoy: 34626, buAnnuel: 53339, percentageBUA: 13 },
        { boutique: "P.LMB", wow: 28, mtd: 19101, mtd1: 37419, aMon: -49, pvMtd: 59152, forecast: 27509, buM: 75482, percentageBU: 25, ytd1: 329382, aYoy: 468895, buAnnuel: 1062421, percentageBUA: -21 }
      ]
    },
    segmentRevenue: {
      headers: ["Segment", "W31", "W32", "W33", "W34", "W35"],
      rows: [
        { segment: "Beauty", values: [464, 1363, 939, 1709, 829] },
        { segment: "Enfant", values: [127.5, 128, 97.5, 115, 0] },
        { segment: "Femme", values: [800, 5360, 5579, 4692.5, 3445] },
        { segment: "Other", values: [140, 40, 20, 60, 0] },
        { segment: "Zarina", values: [95, 235, 130, 145, 380] }
      ],
      total: [1359, 7225.5, 6816, 6664, 4829]
    },
    segmentPerformance: {
      headers: ["Segment", "WoW", "MTD", "MTD-1", "A MON", "PV-MTD", "Forecast", "BU/M", "% BU", "YTD-1", "A YOY", "BU Annuel", "% BU/A"],
      rows: [
        { segment: "Beauty", wow: 51, mtd: 4055, mtd1: 7830, aMon: -48, pvMtd: 13926, forecast: 5857, buM: 75482, percentageBU: 5, ytd1: 65542, aYoy: 76841, buAnnuel: 1062421, percentageBUA: 6 },
        { segment: "Enfant", wow: 18, mtd: 256, mtd1: 1006, aMon: -75, pvMtd: 5169, forecast: 369, buM: 75482, percentageBU: 0, ytd1: 13506, aYoy: 33116, buAnnuel: 1062421, percentageBUA: 1 },
        { segment: "Femme", wow: 27, mtd: 1110, mtd1: 26083, aMon: -47, pvMtd: 37437, forecast: 20381, buM: 75482, percentageBU: 19, ytd1: 246824, aYoy: 348255, buAnnuel: 1062421, percentageBUA: 23 },
        { segment: "Other", wow: 200, mtd: 430, mtd1: 210, aMon: -14, pvMtd: 4490, forecast: 260, buM: 75482, percentageBU: 0, ytd1: 1840, aYoy: 71185, buAnnuel: 1062421, percentageBUA: 0 },
        { segment: "Zarina", wow: 162, mtd: 500, mtd1: 1770, aMon: -72, pvMtd: 1130, forecast: 722, buM: 75482, percentageBU: 1, ytd1: 2270, aYoy: 3228, buAnnuel: 1062421, percentageBUA: 0 },
        { segment: "Total", wow: 23, mtd: 19101, mtd1: 37419, aMon: -49, pvMtd: 59152, forecast: 27509, buM: 75482, percentageBU: 25, ytd1: 329382, aYoy: 468895, buAnnuel: 1062421, percentageBUA: 31 }
      ]
    }
  };

  return mockData;
}

export default async function RevenuePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const revenueData = await getRevenueData(params.month, params.year);
  
  return (
    <RevenueClient 
      revenueData={revenueData}
      searchParams={params}
    />
  );
}