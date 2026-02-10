import { Suspense } from "react";
import { VendeuseSalesDashboard } from "./page.client";
import { TableSkeleton } from "@/components/table-skeleton";
import { POSOrder, POSOrderLine } from "../types/pos";

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
  const m = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
  const y = year || new Date().getFullYear().toString();
  const date = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();

  // const fields = "id,qty,name,product_id,price_unit,price_subtotal,full_product_name,order_id,create_date"
  const fields = "id"

  // Base domain
  let domain = `[["create_date", ">=", "${date} 00:01:00"], ["create_date", "<=", "${y}-${m}-${lastDay} 23:59:59"]]`;

  if (agentId) {
    domain = `[["create_date", ">=", "${date} 00:01:00"], ["create_date", "<=", "${y}-${m}-${lastDay} 23:59:59"], ["order_id.pricelist_id","in",[${agentId}]]]`;
  }

  // 1️⃣ Récupérer les lignes POS
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=${fields}&domain=${domain}`,
    { next: { revalidate: 300 } }
  );
  
  if (!res.ok) throw new Error("Erreur API Odoo - POS Order Lines");

  const { records: orderLines } = await res.json();

  // 2️⃣ Récupérer les commandes correspondantes (pour avoir le client)
  const uniqueOrderIds = [...new Set(orderLines.map((l: POSOrderLine) => l.order_id?.[0]))];

  if (uniqueOrderIds.length === 0) return orderLines;

  const ordersRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,name,partner_id&domain=[["id","in",[${uniqueOrderIds.join(",")}]]]`,
    { next: { revalidate: 300 } }
  );

  if (!ordersRes.ok) throw new Error("Erreur API Odoo - POS Orders");

  const { records: orders } = await ordersRes.json();

  // 3️⃣ Fusionner les clients dans les lignes
  const ordersMap = new Map(orders.map((o: POSOrder) => [o.id, o.partner_id]));

  const linesWithClients = orderLines.map((line: POSOrderLine) => ({
    ...line,
    partner_id: ordersMap.get(line.order_id?.[0]) || null,
  }));

  return { records: linesWithClients };
}


async function getPriceList() {
  // 1️⃣ Récupération des lignes POS
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.pricelist?fields=id,name`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) throw new Error("Erreur API Odoo - Liste de prix");

  const orderLines = await res.json();

  return orderLines;
}

export default async function VendeuseSalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = params.month;
  const year = params.year;
  const agentId = params.agent;

  // Simulation de la détection du rôle utilisateur
  // En pratique, cela viendrait de votre système d'authentification
  const isAdmin = true; // ou false selon l'utilisateur connecté

  const [orderLines, pricelist] = await Promise.all([
    getPOSOrderLinesWithAgent(month, year, agentId),
    getPriceList()
  ])

  console.log(orderLines, pricelist);
  

  return (
    <Suspense fallback={<TableSkeleton />}>
      {/* <VendeuseSalesDashboard
        month={month}
        year={year}
        agentId={agentId}
        isAdmin={isAdmin}
        agents={pricelist.records}
        orderLines={orderLines.records}
      /> */}
    </Suspense>
  );
}