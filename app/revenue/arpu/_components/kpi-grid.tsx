"use client";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, Target, CreditCard } from "lucide-react";
import KpiCard from "@/app/inventory/_components/kpi-card";

interface ArpuStats {
  arpu: number;
  revenue: number;
  customers: number;
  chartData?: { date: string; revenue: number; arpu: number }[];
}

export default function ArpuKpiGrid({ stats }: { stats: ArpuStats }) {
  
  // On prépare les données pour les mini-graphiques (sparklines) 
  // basées sur l'historique récupéré d'Odoo
  const arpuSpark = stats?.chartData?.map(d => ({ v: d.arpu })) || [];
  const revenueSpark = stats?.chartData?.map(d => ({ v: d.revenue })) || [];

  const kpis = [
    {
      title: "ARPU Global",
      value: `${(stats?.arpu || 0).toFixed(2)} $`,
      trend: 12.4, // À calculer en comparant avec stats_prev
      trendLabel: "vs mois dernier",
      icon: <Target className="w-5 h-5 text-indigo-600" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
      sparkColor: "#6366f1",
      sparkData: arpuSpark,
    },
    {
      title: "CA Total (POS)",
      value: `${((stats?.revenue || 0) / 1000).toFixed(1)}k $`,
      trend: 8.2,
      trendLabel: "sur la période",
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
      sparkColor: "#10b981",
      sparkData: revenueSpark,
    },
    {
      title: "Clients (Mobiles)",
      value: (stats?.customers || 0).toLocaleString(),
      trend: 5.1,
      trendLabel: "identifiants uniques",
      icon: <Users className="w-5 h-5 text-blue-600" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      sparkColor: "#3b82f6",
      sparkData: [], // On pourrait mapper l'évolution du nombre de clients ici
    },
    {
      title: "Ticket Moyen",
      value: stats?.customers > 0 
        ? `${(stats.revenue / stats.customers).toFixed(2)} $` 
        : "0.00 $",
      trend: 2.1,
      trendLabel: "par client unique",
      icon: <CreditCard className="w-5 h-5 text-violet-600" />,
      iconBg: "bg-violet-50 dark:bg-violet-950/50",
      sparkColor: "#8b5cf6",
      sparkData: [],
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.title} {...kpi} index={i} />
      ))}
    </motion.div>
  );
}