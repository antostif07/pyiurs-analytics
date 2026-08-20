"use client";

import { motion } from "framer-motion";
import { Boxes, Package, Truck, ShoppingCart, AlertCircle, Inbox } from "lucide-react";
import KpiCard from "./kpi-card";
import { KpiSkeleton } from "@/components/new-ui/layout/skeletons";
import { useStockKpis } from "@/app/inventory/_lib/hooks/use-stock-kpis";
import { useInventory } from "@/app/inventory/_lib/hooks/use-inventory";
import { StockDashboardFilters } from "../stock-dashboard-client";

interface KpiGridProps {
  filters?: StockDashboardFilters;
}

export default function KpiGrid({ filters }: KpiGridProps) {
  // ✅ 1. Connexion directe aux filtres pour rafraîchir la clé de requête TanStack Query
  const { data, isLoading: isKpiLoading, isError } = useStockKpis(filters);
  const { isLoading: isMetadataLoading } = useInventory();

  if (isMetadataLoading || isKpiLoading) {
    return <KpiSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p className="font-medium">
          Erreur lors de la récupération des flux de stock depuis Odoo. Veuillez actualiser.
        </p>
      </div>
    );
  }

  // État vide si aucune boutique n'est sélectionnée
  if (!data) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-2xl border-border bg-card">
        <Inbox className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2 stroke-[1.5]" />
        <p className="text-muted-foreground text-xs font-light">
          Sélectionnez au moins une boutique physique pour afficher les indicateurs de stock.
        </p>
      </div>
    );
  }

  // ✅ 2. Données des 4 cartes stratégiques de flux de stock
  const kpiData = [
    {
      title: "Stock à l'Ouverture",
      value: (data.openingStock || 0).toLocaleString("fr-FR"),
      subValue: data.openingValue ? `$${data.openingValue.toLocaleString("en-US")}` : undefined,
      trend: data.openingTrend ?? 0,
      icon: <Package className="w-4 h-4 text-primary" />,
      iconBg: "bg-primary/10 text-primary",
      sparkData: data.openingSpark || data.salesSpark || [],
      sparkColor: "var(--primary)",
      trendLabel: "au début de la période",
    },
    {
      title: "Réceptions Centralisées (BC)",
      value: `+${(data.qtyReceived || 0).toLocaleString("fr-FR")}`,
      subValue: data.receivedValue ? `$${data.receivedValue.toLocaleString("en-US")}` : undefined,
      trend: data.receivedTrend ?? 0,
      icon: <Truck className="w-4 h-4 text-emerald-600" />,
      iconBg: "bg-emerald-500/10 text-emerald-600",
      sparkData: data.receivedSpark || [],
      sparkColor: "#10b981",
      trendLabel: "depuis centrale PB-BC",
    },
    {
      title: "Ventes POS / Sorties",
      value: `-${(data.qtySold || 0).toLocaleString("fr-FR")}`,
      subValue: data.soldValue ? `$${data.soldValue.toLocaleString("en-US")}` : undefined,
      trend: data.salesTrend ?? 0,
      icon: <ShoppingCart className="w-4 h-4 text-rose-600" />,
      iconBg: "bg-rose-500/10 text-rose-600",
      sparkData: data.salesSpark || [],
      sparkColor: "#f43f5e",
      trendLabel: "sorties caisses boutiques",
    },
    {
      title: "Stock Restant Actuel",
      value: (data.closingStock || 0).toLocaleString("fr-FR"),
      subValue: data.closingValue ? `$${data.closingValue.toLocaleString("en-US")}` : undefined,
      trend: data.closingTrend ?? 0,
      icon: <Boxes className="w-4 h-4 text-sky-600" />,
      iconBg: "bg-sky-500/10 text-sky-600",
      sparkData: data.closingSpark || data.salesSpark || [],
      sparkColor: "#0284c7",
      trendLabel: "physique en magasin",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {kpiData.map((kpi, i) => (
        <KpiCard key={kpi.title} {...kpi} index={i} />
      ))}
    </motion.div>
  );
}