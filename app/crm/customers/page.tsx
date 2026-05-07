// app/crm/customers/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import CustomerListClient from "./customer-list-client";

export const metadata = {
  title: "Annuaire Clients | CRM Dashboard",
  description: "Liste complète des clients, segmentation et historique de valeur (LTV)",
};

export default async function CustomersPage() {
  return (
    <div className="text-foreground min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* En-tête de la page */}
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
            Annuaire <span className="text-indigo-600">Clients</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-wide">
            Gérez votre base de données et identifiez vos clients à plus forte valeur.
          </p>
        </div>

        {/* Liste des clients avec Suspense pour le chargement */}
        <Suspense fallback={<DashboardSkeleton />}>
          <CustomerListClient />
        </Suspense>
        
      </div>
    </div>
  );
}