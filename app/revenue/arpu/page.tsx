// app/dashboard/arpu/page.tsx
import { Suspense } from "react";
import ArpuDashboardClient from "./arpu-dashboard-client";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";

export default async function ArpuPage() {
  // Simuler un appel API pour les métadonnées (Plans, Régions, etc.)
  const metadata = {
    plans: ["Starter", "Pro", "Enterprise"],
    regions: ["EMEA", "APAC", "Americas"]
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <ArpuDashboardClient initialMetadata={metadata} />
        </Suspense>
      </div>
    </div>
  );
}