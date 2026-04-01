import { Suspense } from "react";
import { VendeuseSalesDashboard } from "./page.client";
import { TableSkeleton } from "@/components/table-skeleton";
import { POSOrder, POSOrderLine } from "../types/pos";
import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

// Types
export interface VenteDetail {
  id: string;
  client: string;
  numero: string;
  total: number;
  facture: string;
  produits: string[];
  pos: string;
  date: string;
}

export interface VendeuseSummary {
  totalVentes: number;
  totalCout: number;
  totalCommission: number;
  nombreVentes: number;
}

export interface VendeuseSalesData {
  summary: VendeuseSummary;
  details: VenteDetail[];
}

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    agent?: string;
  }>;
}

async function getPOSOrderLinesWithAgent(month?: string, year?: string, agentId?: string) {
  // const m = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const m = !month ? (new Date().getMonth() + 1).toString().padStart(2, '0') : (
    month.length > 1 ? month : `0${month}`
  )
  
  const y = year || new Date().getFullYear().toString();
  const date = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();

  // Base domain
  let domain: OdooDomain = [["create_date", ">=", `${date} 00:01:00`], ["create_date", "<=", `${y}-${m}-${lastDay} 23:59:59`]];

  if (agentId) {
    domain = [
      ["create_date", ">=", `${date} 00:01:00`],
      ["create_date", "<=", `${y}-${m}-${lastDay} 23:59:59`],
      ["order_id.pricelist_id","in",[Number(agentId)]]
    ];
  }

  // 1️⃣ Récupérer les lignes POS
  const orderLines = await odooClient.searchRead<POSOrderLine>("pos.order.line", {
    domain: domain,
    fields: ["id", "qty", "name", "product_id", "price_unit", "full_product_name", "order_id", "create_date"]
  })
  
  // 2️⃣ Récupérer les commandes correspondantes (pour avoir le client)
  const uniqueOrderIds = [...new Set(orderLines.map((l: POSOrderLine) => l.order_id?.[0]))];

  if (uniqueOrderIds.length === 0) return orderLines;

  const orders = await odooClient.searchRead<POSOrder>("pos.order", {
    domain: [["id","in",uniqueOrderIds]],
    fields: ["id","name","partner_id"]
  })
  
  // 3️⃣ Fusionner les clients dans les lignes
  const ordersMap = new Map(orders.map((o: POSOrder) => [o.id, o.partner_id]));

  const linesWithClients = orderLines.map((line: POSOrderLine) => ({
    ...line,
    partner_id: ordersMap.get(line.order_id?.[0]) || null,
  }));

  return linesWithClients;
}


async function getPriceList() {
  const pricelists = await odooClient.searchRead("product.pricelist", {
    fields: ["id","name"]
  })
  
  return pricelists;
}

export default async function VendeuseSalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = params.month;
  const year = params.year;
  const agentId = params.agent;

  // Simulation de la détection du rôle utilisateur
  // En pratique, cela viendrait de votre système d'authentification
  const isAdmin = true; // ou false selon l'utilisateur connecté

  const orderLines = await getPOSOrderLinesWithAgent(month, year, agentId);
  const pricelist = await getPriceList()

  return (
    <Suspense fallback={<TableSkeleton />}>
      <VendeuseSalesDashboard
        month={month}
        year={year}
        agentId={agentId}
        isAdmin={isAdmin}
        agents={pricelist as { id: number; name: string; }[]}
        orderLines={orderLines as POSOrderLine[]}
      />
    </Suspense>
  );
}