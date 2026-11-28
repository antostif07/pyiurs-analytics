import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { isHrRole } from "@/lib/auth/hr-roles";
import { getEmployees, getShops } from "../actions";
import EmployeesClient from "./employees-client";
import type { EmployeeWithShop } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Annuaire des Collaborateurs | RH",
  description: "Annuaire complet des agents, affectations boutiques, fiches de paie et dossiers.",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    shopId?: string;
    status?: "active" | "inactive" | "all";
  }>;
}

async function EmployeesLoader({ searchParams }: PageProps) {
  const [params, auth] = await Promise.all([searchParams, getServerAuth()]);

  if (!auth.user) {
    redirect("/login?next=/hr/employees");
  }
  if (!auth.profile || !isHrRole(auth.profile.role)) {
    redirect("/unauthorized?reason=insufficient_permissions");
  }

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;
  const search = params?.search || "";
  const sortBy = params?.sortBy || "name";
  const sortOrder = (params?.sortOrder as "asc" | "desc") || "asc";
  const shopId = params?.shopId;
  const status = (params?.status as "active" | "inactive" | "all") || "active";

  let initialData: {
    data: EmployeeWithShop[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } = {
    data: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: page,
  };

  let shops: Array<{ id: string; name: string }> = [];

  try {
    const [empRes, shopRes] = await Promise.all([
      getEmployees(page, limit, search, sortBy, sortOrder, shopId, status),
      getShops(),
    ]);
    initialData = empRes;
    shops = (shopRes || []).map((s: any) => ({ id: s.id, name: s.name }));
  } catch (error) {
    console.error("[EMPLOYEES_PAGE] Échec du préchargement:", error);
  }

  return (
    <EmployeesClient
      initialData={initialData}
      initialShops={shops}
      userRole={auth.profile.role ?? "user"}
    />
  );
}

export default function EmployeesDirectoryPage({ searchParams }: PageProps) {
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
          <div className="h-80 rounded-lg bg-muted/40" />
        </div>
      }
    >
      <EmployeesLoader searchParams={searchParams} />
    </Suspense>
  );
}