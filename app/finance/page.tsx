// app/finance/cash-flow/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import { getFinanceMetadata } from "./actions";
import CashFlowClient from "./cash-flow-client";

export const metadata = {
  title: "Cash Flow | Finance Dashboard",
  description: "Analyse des flux de trésorerie par point de vente et segments",
};

export default async function CashFlowPage() {
  // Récupération des boutiques (Shops) pour l'affichage des colonnes
  const initialMetadata = await getFinanceMetadata();

  return (
    <div className="text-foreground min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <CashFlowClient initialMetadata={initialMetadata} />
        </Suspense>
      </div>
    </div>
  );
}