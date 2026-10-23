// app/revenue/arpu/_components/kpi-grid.tsx
"use client";

import {
  CreditCard,
  DollarSign,
  Target,
  Users,
} from "lucide-react";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";

interface ArpuStats {
  arpu: number;
  revenue: number;
  customers: number;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " $";

const fmtMoneyCompact = (n: number) =>
  n >= 1000
    ? `${(n / 1000).toFixed(1)}k $`
    : n.toLocaleString("fr-FR") + " $";

const fmtInt = (n: number) => n.toLocaleString("fr-FR");

export default function ArpuKpiGrid({ stats }: { stats: ArpuStats }) {
  const ticketMoyen =
    stats.customers > 0 ? stats.revenue / stats.customers : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. ARPU */}
      <CeoKpiCard
        label="ARPU Global"
        value={fmtMoney(stats.arpu)}
        subtitle="Par mobile unique sur la période"
        icon={<Target className="w-3.5 h-3.5" />}
        iconColor="text-violet-600 dark:text-violet-400"
        iconBg="bg-violet-50 dark:bg-violet-950/40"
      />

      {/* 2. CA Total */}
      <CeoKpiCard
        label="CA Total (POS)"
        value={fmtMoneyCompact(stats.revenue)}
        subtitle={
          stats.revenue >= 1000
            ? fmtMoney(stats.revenue)
            : "Sur la période sélectionnée"
        }
        icon={<DollarSign className="w-3.5 h-3.5" />}
        iconColor="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-50 dark:bg-sky-950/40"
      />

      {/* 3. Clients */}
      <CeoKpiCard
        label="Clients identifiés"
        value={fmtInt(stats.customers)}
        subtitle="Mobiles uniques (POS)"
        icon={<Users className="w-3.5 h-3.5" />}
        iconColor="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
      />

      {/* 4. Ticket Moyen */}
      <CeoKpiCard
        label="Ticket moyen"
        value={fmtMoney(ticketMoyen)}
        subtitle="CA / client unique"
        icon={<CreditCard className="w-3.5 h-3.5" />}
        iconColor="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-50 dark:bg-amber-950/40"
      />
    </div>
  );
}