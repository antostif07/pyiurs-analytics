import { Suspense } from "react";
import { Metadata } from "next";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import StockDashboardClient from "./stock-dashboard-client";
import { getInventoryMetadata } from "./_lib/actions/inventory-actions";

export const metadata: Metadata = {
  title: "Vue d'ensemble Stocks | Pyiurs Analytics",
  description: "Tableau de bord de suivi des stocks, valorisation et alertes de rupture en temps réel.",
};

export default async function InventoryPage() {
  let initialMetadata = null;

  try {
    initialMetadata = await getInventoryMetadata();
  } catch (error) {
    console.error("[INVENTORY_PAGE_ERROR] Erreur récupération métadonnées Odoo:", error);
  }

  return (
    <div className="text-foreground min-h-screen bg-background transition-colors duration-150">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <StockDashboardClient initialMetadata={initialMetadata} />
        </Suspense>
      </div>
    </div>
  );
}