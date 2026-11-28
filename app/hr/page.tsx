import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isHrRole } from "@/lib/auth/hr-roles";
import {
  parseHrDashboardFilters,
  serializeHrDashboardFilters,
} from "./_lib/filters";
import { fetchHrDashboardData } from "./_lib/server/hr-dashboard-service";
import HrDashboardClient from "./hr-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de Bord | RH",
  description: "Pilotage RH : effectifs, présences du jour, paie et avances.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function HrDashboardLoader({ searchParams }: PageProps) {
  const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

  if (!auth.user) redirect("/login?next=/hr");
  if (!auth.profile || !isHrRole(auth.profile.role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  const filters = parseHrDashboardFilters(rawParams);
  const queryKeyString = serializeHrDashboardFilters(filters).toString();
  const initialData = await fetchHrDashboardData(auth.profile, filters);

  return (
    <HrDashboardClient
      initialData={initialData}
      initialQueryKeyString={queryKeyString}
      initialFetchedAt={Date.now()}
      userRole={auth.profile.role ?? "user"}
      userName={auth.profile.full_name || auth.user.email || "Collaborateur"}
    />
  );
}

export default function HRPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-5 space-y-4 animate-pulse">
          <div className="h-16 rounded-lg bg-muted/40" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted/40" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted/40" />
        </div>
      }
    >
      <HrDashboardLoader searchParams={searchParams} />
    </Suspense>
  );
}