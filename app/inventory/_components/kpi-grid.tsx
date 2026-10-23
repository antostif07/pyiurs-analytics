// app/inventory/_components/kpi-grid.tsx
"use client";

import { AlertCircle, ArrowDownRight, ArrowUpRight, Boxes, TrendingUp } from "lucide-react";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { KpiSkeleton } from "@/components/new-ui/layout/skeletons";
import { useInventoryOverview } from "../_lib/hooks/use-inventory-overview";
import { cn } from "@/lib/utils";

const fmtMoney = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " $";

const fmtInt = (n: number) => n.toLocaleString("fr-FR");
const fmtPct = (n: number) => `${n.toFixed(1)} %`;

export default function KpiGrid() {
  const { data, isLoading, isError } = useInventoryOverview();

  if (isLoading) return <KpiSkeleton />;

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-400">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Erreur lors du chargement des KPIs stock.
      </div>
    );
  }

  const { opening, closing, movements } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Stock Ouverture */}
      <CeoKpiCard
        label="Stock Ouverture"
        value={`${fmtInt(opening.totalUnits)} pcs`}
        subtitle={
          <span className="flex flex-wrap items-center gap-1">
            <span>{fmtInt(opening.productCount)} produits</span>
            <span className="opacity-40">·</span>
            <span className="text-sky-700 dark:text-sky-400">
              {fmtMoney(opening.saleValue)} vente
            </span>
            <span className="opacity-40">·</span>
            <span className="text-amber-700 dark:text-amber-400">
              {fmtMoney(opening.costValue)} coût
            </span>
          </span>
        }
        icon={<Boxes className="w-3.5 h-3.5" />}
        iconColor="text-violet-600 dark:text-violet-400"
        iconBg="bg-violet-50 dark:bg-violet-950/40"
      />

      {/* 2. Stock Fermeture */}
      <CeoKpiCard
        label="Stock Fermeture"
        value={`${fmtInt(closing.totalUnits)} pcs`}
        subtitle={
          <span className="flex flex-wrap items-center gap-1">
            <span>{fmtInt(closing.productCount)} produits</span>
            <span className="opacity-40">·</span>
            <span className="text-sky-700 dark:text-sky-400">
              {fmtMoney(closing.saleValue)} vente
            </span>
            <span className="opacity-40">·</span>
            <span className="text-amber-700 dark:text-amber-400">
              {fmtMoney(closing.costValue)} coût
            </span>
          </span>
        }
        icon={<Boxes className="w-3.5 h-3.5" />}
        iconColor="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-50 dark:bg-sky-950/40"
      />

      {/* 3. Mouvements */}
      <CeoKpiCard
        label="Mouvements de la période"
        value={`+${fmtInt(movements.receivedUnits)} / −${fmtInt(movements.soldUnits)}`}
        subtitle={
          <span
            className={cn(
              "flex items-center gap-1",
              movements.netVariation >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {movements.netVariation >= 0 ? (
              <ArrowUpRight className="w-2.5 h-2.5" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5" />
            )}
            Variation nette :{" "}
            <strong>
              {movements.netVariation > 0 ? "+" : ""}
              {fmtInt(movements.netVariation)} pcs
            </strong>
          </span>
        }
        icon={<TrendingUp className="w-3.5 h-3.5" />}
        iconColor="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
      />

      {/* 4. Marge potentielle (sur fermeture) */}
      <CeoKpiCard
        label="Marge potentielle"
        value={fmtMoney(closing.marginValue)}
        subtitle={
          <span className="flex flex-wrap items-center gap-1">
            <span>{fmtPct(closing.marginRate)} du CA</span>
            <span className="opacity-40">·</span>
            <span className="text-sky-700 dark:text-sky-400">
              {fmtMoney(closing.saleValue)} CA potentiel
            </span>
          </span>
        }
        icon={<TrendingUp className="w-3.5 h-3.5" />}
        iconColor={
          closing.marginValue >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }
        iconBg={
          closing.marginValue >= 0
            ? "bg-emerald-50 dark:bg-emerald-950/40"
            : "bg-rose-50 dark:bg-rose-950/40"
        }
      />
    </div>
  );
}