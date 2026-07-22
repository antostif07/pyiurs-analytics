import { getRevenueDashboardData } from "./actions";
import { AdvancedPerformanceTable } from "@/components/revenue/advanced-performance-table";
import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { RevenueKPICard } from "@/components/revenue/revenue-kpi-card";
import { WeeklyRevenueTable } from "@/components/revenue/weekly-revenue-table";
import { Badge } from "@/components/ui/badge"; // ✅ Importation du composant Badge officiel
import { format } from "date-fns";

/**
 * Calcule de manière symétrique les progressions hebdomadaires (Delta WoW)
 * pour n'importe quelle série temporelle d'items (Boutiques ou Segments).
 */
function computeTableMetrics<T extends { weeks?: Record<string, number> }>(items: T[]) {
  return items.map((item) => {
    const weeks = item.weeks || {};
    const weekKeys = Object.keys(weeks).sort();
    const lastWeek = weekKeys[weekKeys.length - 1];
    const prevWeek = weekKeys[weekKeys.length - 2];

    const valLast = weeks[lastWeek] || 0;
    const valPrev = weeks[prevWeek] || 0;

    return {
      ...item,
      deltaWoW: valPrev > 0 ? Math.round(((valLast - valPrev) / valPrev) * 100) : 0,
      deltaYoY: 0 // Évolutif : comparaison N-1
    };
  });
}

export default async function RevenueOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const month = params.month || format(new Date(), "MM");
  const year = params.year || format(new Date(), "yyyy");

  const data = await getRevenueDashboardData(month, year);

  const totals = {
    today: data.shopPerformance.reduce((acc, curr) => acc + curr.today, 0),
    yesterday: data.shopPerformance.reduce((acc, curr) => acc + curr.yesterday, 0),
    weekly: data.shopPerformance.reduce((acc, curr) => acc + curr.weekly, 0),
    mtd: data.shopPerformance.reduce((acc, curr) => acc + curr.mtd, 0),
    budget: data.shopPerformance.reduce((acc, curr) => acc + curr.budgetMensuel, 0),
  };

  // 3. PRÉPARATION DES CARTES KPI (Estimation budget journalier sur 26 jours ouvrés)
  const dailyBudget = Math.round(totals.budget / 26);

  const kpiCards = [
    {
      label: "Vente du jour",
      amount: totals.today,
      budget: dailyBudget
    },
    {
      label: "Vente J-1",
      amount: totals.yesterday,
      budget: dailyBudget,
      isYesterday: true
    },
    {
      label: "Vente de la semaine",
      amount: totals.weekly,
      budget: Math.round(totals.budget / 4)
    },
    {
      label: "Vente du Mois",
      amount: totals.mtd,
      budget: totals.budget
    },
  ];

  // 4. CALCUL SYMÉTRIQUE DES DELTAS POUR LES BOUTIQUES ET LES SEGMENTS (Femme, Enfant, Beauté)
  const processedShops = computeTableMetrics(data.shopPerformance);
  const processedSegments = computeTableMetrics(data.segmentPerformance);

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-300">

      {/* 1. EN-TÊTE AVEC SÉLECTEUR DE DATES */}
      <div className="flex flex-col md:flex-row justify-between sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
            Suivi des Revenus <span className="text-primary font-black">Global</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Consolidation financière du mois {month}/{year}
          </p>
        </div>
        <RevenueDateFilter />
      </div>

      {/* 2. CARTES KPIS (4 Métriques clés) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <RevenueKPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* 3. SECTION A : PERFORMANCE PAR BOUTIQUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Analyse de Performance par Boutique
            </h2>
            <Badge variant="outline" className="text-[9px] uppercase font-mono">
              Points de vente
            </Badge>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-bold">
            Devise: USD ($)
          </Badge>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-4 space-y-2">
            <WeeklyRevenueTable data={processedShops} />
          </section>
          <section className="xl:col-span-8 space-y-2">
            <AdvancedPerformanceTable data={processedShops} />
          </section>
        </div>
      </div>

      {/* 4. SECTION B : PERFORMANCE PAR SEGMENT (FEMME, ENFANT, BEAUTÉ) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Analyse de Performance par Segment Produit
            </h2>
            <Badge variant="outline" className="text-[9px] uppercase font-mono text-primary border-primary/30">
              Femme • Enfant • Beauté
            </Badge>
          </div>
          <Badge className="bg-muted text-muted-foreground text-[9px] uppercase font-bold">
            MTD Analysis
          </Badge>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-4 space-y-2">
            <WeeklyRevenueTable data={processedSegments} />
          </section>
          <section className="xl:col-span-8 space-y-2">
            <AdvancedPerformanceTable data={processedSegments} />
          </section>
        </div>
      </div>

    </div>
  );
}