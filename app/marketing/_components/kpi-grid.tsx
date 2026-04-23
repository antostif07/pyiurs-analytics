"use client";
import KpiCard from "@/app/inventory/_components/kpi-card";
import { motion } from "framer-motion";
import { DollarSign, Megaphone, Target, BarChart3, TrendingUp } from "lucide-react";

export default function MarketingKpiGrid() {
  // Mock data - À remplacer par vos hooks Supabase/Odoo plus tard
  const kpiData = [
    {
      title: "Chiffre d'Affaires Ads",
      value: "$45,231",
      trend: 12.5,
      icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
      sparkData: [{v: 10}, {v: 25}, {v: 15}, {v: 40}, {v: 30}, {v: 55}],
      sparkColor: "#10b981",
      trendLabel: "vs mois dernier"
    },
    {
      title: "Dépenses Publicitaires",
      value: "$8,432",
      trend: -4.2,
      icon: <Megaphone className="w-4 h-4 text-indigo-500" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
      sparkData: [{v: 20}, {v: 15}, {v: 22}, {v: 18}, {v: 25}, {v: 12}],
      sparkColor: "#6366f1",
      trendLabel: "optimisation en cours"
    },
    {
      title: "ROAS Global",
      value: "5.36x",
      trend: 0.8,
      icon: <Target className="w-4 h-4 text-rose-500" />,
      iconBg: "bg-rose-50 dark:bg-rose-950/50",
      sparkData: [{v: 3}, {v: 4}, {v: 3.5}, {v: 5}, {v: 5.2}, {v: 5.36}],
      sparkColor: "#f43f5e",
      trendLabel: "Retour sur investissement"
    },
    {
      title: "Taux de Conversion",
      value: "1.8%",
      trend: 2.1,
      icon: <BarChart3 className="w-4 h-4 text-cyan-500" />,
      iconBg: "bg-cyan-50 dark:bg-cyan-950/50",
      sparkData: [{v: 1.2}, {v: 1.1}, {v: 1.5}, {v: 1.4}, {v: 1.7}, {v: 1.8}],
      sparkColor: "#06b6d4",
      trendLabel: "Messages vers Ventes"
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