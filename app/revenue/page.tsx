import { AdvancedPerformanceTable } from "@/components/revenue/advanced-performance-table";
import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { RevenueKPICard } from "@/components/revenue/revenue-kpi-card";
import { WeeklyRevenueTable } from "@/components/revenue/weekly-revenue-table";
import { format, getWeek, subWeeks } from "date-fns";
import { getRevenueDashboardData } from "./actions";

export default async function RevenueOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const month = params.month || format(new Date(), "MM");
  const year = params.year || format(new Date(), "yyyy");
  

  // 1. RÉCUPÉRATION DES DONNÉES RÉELLES
  const data = await getRevenueDashboardData(month, year);

  // 2. CALCUL DES TOTAUX GLOBAUX POUR LES CARTES KPI
  const totals = {
    today: data.reduce((acc, curr) => acc + curr.today, 0),
    yesterday: data.reduce((acc, curr) => acc + curr.yesterday, 0),
    weekly: data.reduce((acc, curr) => acc + curr.weekly, 0),
    mtd: data.reduce((acc, curr) => acc + curr.mtd, 0),
    budget: data.reduce((acc, curr) => acc + curr.budgetMensuel, 0),
  };

  // 3. PRÉPARATION DES CARTES KPI
  // Note : Le budget journalier est estimé en divisant le budget mensuel par 26 (jours ouvrés)
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

  // 4. CALCUL DU DELTA WOW (Week over Week) POUR LE TABLEAU AVANCÉ
  // On compare la semaine actuelle à la précédente si les données existent
  const processedDataForTables = data.map(shop => {
    const weekKeys = Object.keys(shop.weeks).sort();
    const lastWeek = weekKeys[weekKeys.length - 1];
    const prevWeek = weekKeys[weekKeys.length - 2];
    
    const valLast = shop.weeks[lastWeek] || 0;
    const valPrev = shop.weeks[prevWeek] || 0;

    return {
        ...shop,
        deltaWoW: valPrev > 0 ? Math.round(((valLast - valPrev) / valPrev) * 100) : 0,
        // Pour deltaYoY, on peut mettre 0 ou ajouter une requête N-1 plus tard
        deltaYoY: 0 
    };
  });

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* 1. HEADER AVEC FILTRE */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
            Suivi des Revenus <span className="text-emerald-600">Boutiques</span>
          </h1>
        </div>
        <RevenueDateFilter />
      </div>

      {/* 2. KPIs (La barre de 4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <RevenueKPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* 3. TABLEAUX CÔTE À CÔTE SUR XL SCREEN */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* ANALYSE HEBDO (Prend 4 colonnes sur 12) */}
        <section className="xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Flux Hebdomadaire
            </h2>
            <Badge variant="outline" className="text-[9px] border-emerald-100 text-emerald-600 uppercase font-black">
                $ USD
            </Badge>
          </div>
          <WeeklyRevenueTable data={processedDataForTables} />
        </section>

        {/* PERFORMANCE AVANCÉE (Prend 8 colonnes sur 12) */}
        <section className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Performance vs Objectifs & Forecast
            </h2>
            <div className="flex gap-2">
                <Badge className="bg-emerald-500 text-white border-none text-[9px] uppercase font-black tracking-widest">
                    MTD Analysis
                </Badge>
            </div>
          </div>
          <AdvancedPerformanceTable data={processedDataForTables} />
        </section>
      </div>
    </div>
  );
}

// Petit composant Badge local si non importé
function Badge({ children, className, variant }: any) {
    const base = "px-2 py-0.5 rounded-md text-[10px] font-bold border ";
    const variants: any = {
        outline: "bg-transparent border-slate-200 text-slate-500",
        default: "bg-slate-900 text-white border-transparent"
    };
    return <span className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</span>;
}