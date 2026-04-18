// app/dashboard/inventory/page.tsx
import { Suspense } from "react";
import { getInventoryMetadata } from "@/app/actions/odoo";
import { DashboardSkeleton } from "../../components/new-ui/layout/skeletons";
import StockDashboardClient from "./stock-dashboard-client";

export default async function InventoryPage() {
  // Récupération des données critiques côté serveur
  const initialMetadata = await getInventoryMetadata();

  return (
    <div className="text-foreground min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <StockDashboardClient initialMetadata={initialMetadata} />
        </Suspense>
      </div>
    </div>
  );
}