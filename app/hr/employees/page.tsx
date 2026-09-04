// app/hr/employees/page.tsx

import { Metadata } from "next";
import { getEmployees } from "../actions";
import EmployeesClient from "./employees-client";
import { EmployeeWithShop } from "@/lib/supabase/types";

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

export const metadata: Metadata = {
  title: "Annuaire des Agents & Collaborateurs | Pyiurs Enterprise",
  description: "Gestion des fiches collaborateurs, boutiques d'affectation, contrats et rémunérations.",
};

export default async function EmployeesDirectoryPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;
  const search = params?.search || "";
  const sortBy = params?.sortBy || "name";
  const sortOrder = (params?.sortOrder as "asc" | "desc") || "asc";
  const shopId = params?.shopId;
  const status = (params?.status as "active" | "inactive" | "all") || "active"; // ✅ Actifs par défaut

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

  try {
    initialData = await getEmployees(page, limit, search, sortBy, sortOrder, shopId, status);
  } catch (error) {
    console.error("Échec du préchargement serveur des employés:", error);
  }

  return (
    <div className="space-y-6">
      <EmployeesClient initialData={initialData} />
    </div>
  );
}