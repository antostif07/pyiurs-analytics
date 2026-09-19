// app/ceo-report/sales/sales-matrix-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import SalesRevenueMatrixTable from "./_components/sales-revenue-matrix-table";
import SalesExecutiveSummary from "./_components/sales-executive-summary";
import type { SalesMatrixData } from "./_components/types";
import DashboardHeader from "@/app/revenue/arpu/_components/arpu-header";
import { SALES_MATRIX_INITIAL_DATA } from "./_components/data";

export default function SalesMatrixClient() {
  const [data] = useState<SalesMatrixData>(SALES_MATRIX_INITIAL_DATA);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 1. Header Global avec Presets et Synchronisation */}
      <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} en cours...`)} />

      {/* 2. Synthèse Visuelle & KPIs "App-Friendly" */}
      <SalesExecutiveSummary data={data} />

      {/* 3. La Matrice Croisée Exacte (Tableau Excel moderne) */}
      <SalesRevenueMatrixTable data={data} />
    </div>
  );
}