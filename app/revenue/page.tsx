import { Metadata } from "next";
import { getRevenueDashboardData } from "./actions";
import { AdvancedPerformanceTable } from "@/components/revenue/advanced-performance-table";
import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { RevenueKPICard } from "@/components/revenue/revenue-kpi-card";
import { WeeklyRevenueTable } from "@/components/revenue/weekly-revenue-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";
import {
  computeTableMetrics,
  calculateTotals,
  calculatePaceMetrics
} from "./revenue-helpers";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const month = params.month || format(new Date(), "MM");
  const year = params.year || format(new Date(), "yyyy");

  return {
    title: `Suivi des Revenus (${month}/${year})`,
    description: `Consolidation financière et performance des boutiques pour ${month}/${year}.`,
  };
}

export default async function RevenueOverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();

  const month = params.month || format(now, "MM");
  const year = params.year || format(now, "yyyy");

  // Typage dynamique du retour de la Server Action
  let data: Awaited<ReturnType<typeof getRevenueDashboardData>> = {
    shopPerformance: [],
    segmentPerformance: [],
    isAccessDenied: false
  };

  let fetchError = false;

  try {
    data = await getRevenueDashboardData(month, year);
  } catch (error) {
    console.error("[REVENUE_PAGE_ERROR] Erreur de chargement Odoo/Supabase:", error);
    fetchError = true;
  }

  if (data.isAccessDenied) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-card border border-border rounded-2xl shadow-xs my-8">
        <div className="p-3.5 rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
          Accès Restreint
        </h2>
        <p className="text-xs text-muted-foreground font-light max-w-md mt-1.5 leading-relaxed">
          Votre rôle d'utilisateur ne vous autorise pas à consulter le tableau de suivi financier des revenus. Veuillez contacter votre administrateur si vous devez obtenir un accès.
        </p>
      </div>
    );
  }

  // Calculs financiers isolés
  const totals = calculateTotals(data.shopPerformance);
  const pace = calculatePaceMetrics(month, year, totals);

  const kpiCards = [
    {
      label: "Vente du jour",
      amount: totals.today,
      budget: pace.dailyBudget,
      budgetTypeLabel: "Cible jour prévue"
    },
    {
      label: "Vente J-1",
      amount: totals.yesterday,
      budget: pace.dailyBudget,
      budgetTypeLabel: "Cible jour prévue",
      isYesterday: true
    },
    {
      label: "Vente de la semaine",
      amount: totals.weekly,
      budget: pace.weeklyBudget,
      budgetTypeLabel: "Cible hebdo prévue"
    },
    {
      label: "Vente du Mois (MTD)",
      amount: totals.mtd,
      budget: totals.budget,
      budgetTypeLabel: "Budget mois global"
    },
  ];

  const processedShops = computeTableMetrics(data.shopPerformance);
  const processedSegments = computeTableMetrics(data.segmentPerformance);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-300">

      {/* Alerte d'erreur de secours */}
      {fetchError && (
        <div className="bg-destructive/10 border-l-2 border-destructive p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-xs text-destructive font-medium">
            Connexion temporairement ralentie avec Odoo. Les données affichées peuvent être partielles.
          </p>
        </div>
      )}

      {/* ✅ 1. EN-TÊTE RESPONSIVE NETTOYÉ (Sans doublon) */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-border pb-6">

        {/* Titre & Taux de Réalisation */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
              Suivi des Revenus <span className="text-primary font-black">Global</span>
            </h1>
            {totals.budget > 0 && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold">
                {pace.budgetRealizationPercent}% du Budget
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Consolidation financière du mois {month}/{year} ({pace.daysPassed}/{pace.daysInSelectedMonth} jours écoulés)
          </p>
        </div>

        {/* Bloc Actions : Projection Pace & Filtre de Dates */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">

          {/* Carte de Projection Fin de Mois (Pace) */}
          <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-2.5 shadow-xs shrink-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <TrendingUp className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
                Projection Fin de Mois (Pace)
              </span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-xs font-bold text-foreground">
                  ${pace.runRateForecast.toLocaleString("en-US")}
                </span>
                {totals.budget > 0 && (
                  <span className={`text-[9px] font-bold ${pace.runRateForecast >= totals.budget ? "text-emerald-600" : "text-amber-600"
                    }`}>
                    ({Math.round((pace.runRateForecast / totals.budget) * 100)}% Cible)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filtre de Date */}
          <div className="shrink-0 flex justify-end">
            <RevenueDateFilter />
          </div>

        </div>
      </div>

      {/* 2. CARTES KPIS */}
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
              {data.shopPerformance.length} Points de vente
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