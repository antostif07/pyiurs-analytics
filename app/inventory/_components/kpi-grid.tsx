"use client";
import { motion } from "framer-motion";
import { Boxes, Package, Truck, ShoppingCart, AlertCircle } from "lucide-react";
import KpiCard from "./kpi-card";
import { KpiSkeleton } from "../../../components/new-ui/layout/skeletons";
import { useStockKpis } from "@/hooks/use-stock-kpis";
import { useInventory } from "@/hooks/use-inventory"; // Import indispensable

export default function KpiGrid() {
  // 1. Récupérer les deux états de chargement
  const { data, isLoading: isKpiLoading, isError, fetchStatus } = useStockKpis();
  const { isLoading: isMetadataLoading } = useInventory();

  if (isMetadataLoading || isKpiLoading) {
    return <KpiSkeleton />;
  }

  // 2. Gestion des erreurs
  if (isError) return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
      <AlertCircle className="w-5 h-5" />
      <p className="text-sm font-medium">Erreur lors de la récupération des données Odoo.</p>
    </div>
  );

  // 3. État vide réel (Arrive seulement si le chargement est FINI et qu'il n'y a pas de data)
  if (!data) return (
    <div className="p-8 text-center border-2 border-dashed rounded-2xl border-border">
      <p className="text-muted-foreground text-sm font-medium">
        Veuillez sélectionner au moins une boutique pour afficher les indicateurs.
      </p>
    </div>
  );

  const kpiData = [
    {
      title: "Stock à l'ouverture",
      value: (data.openingStock || 0).toLocaleString(),
      trend: 0,
      icon: <Package className="w-4 h-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
      sparkData: data.salesSpark || [], 
      sparkColor: "#6366f1",
      trendLabel: "au début de la période"
    },
    {
      title: "Réceptions Fournisseurs (BC)",
      value: `+${(data.qtyReceived || 0).toLocaleString()}`,
      trend: 10,
      icon: <Truck className="w-4 h-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
      sparkData: data.receivedSpark || [],
      sparkColor: "#10b981",
      trendLabel: "depuis BC/DC"
    },
    {
      title: "Ventes / Sorties",
      value: `-${(data.qtySold || 0).toLocaleString()}`,
      trend: -5,
      icon: <ShoppingCart className="w-4 h-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-950/50",
      sparkData: data.salesSpark || [],
      sparkColor: "#f43f5e",
      trendLabel: "sorties clients"
    },
    {
      title: "Stock Restant",
      value: (data.closingStock || 0).toLocaleString(),
      trend: 12,
      icon: <Boxes className="w-4 h-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-950/50",
      sparkData: data.salesSpark || [],
      sparkColor: "#06b6d4",
      trendLabel: "actuellement en stock"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {kpiData.map((kpi, i) => (
        <KpiCard key={kpi.title} {...kpi} index={i} />
      ))}
    </motion.div>
  );
}