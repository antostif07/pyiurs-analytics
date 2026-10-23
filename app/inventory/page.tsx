// app/inventory/page.tsx
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import StockDashboardClient from "./stock-dashboard-client";

export const metadata: Metadata = {
  title: "Vue d'ensemble Stocks | Pyiurs",
  description:
    "Valorisation consolidée du stock : valeur vente, valeur coût et alertes.",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, odoo_company_id")
    .not("odoo_company_id", "is", null)
    .order("name");

  if (error) {
    console.warn("[INVENTORY_PAGE] shops fetch failed:", error.message);
  }

  const companies = (shops ?? [])
    .filter((s) => s.odoo_company_id != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      odooCompanyId: s.odoo_company_id as number,
    }));

  return <StockDashboardClient companies={companies} />;
}