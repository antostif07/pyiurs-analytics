"use client";
import { useState } from "react";
import ArpuToolbar from "./_components/arpu-toolbar";
import ArpuKpiGrid from "./_components/kpi-grid";
import ArpuAnalytics from "./_components/analytics-section";
import ArpuTable from "./_components/arpu-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import { useArpuData } from "@/hooks/use-arpu";
import DashboardHeader from "./_components/arpu-header";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ArpuMonthlyMatrix from "./_components/arpu-monthly-matrix";

export default function ArpuDashboardClient({ initialMetadata }: { initialMetadata: any }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname()

    // 1. Gestion du Compare Mode (URL + State)
    const [compareMode, setCompareMode] = useState(searchParams.get("compare") === "true");

    // 2. Extraire les filtres de l'URL
    // Note: on utilise des strings pour les segments ("Femme", "Beauty", etc.)
    const from = searchParams.get("from") ? parseISO(searchParams.get("from")!) : startOfMonth(new Date());
    const to = searchParams.get("to") ? parseISO(searchParams.get("to")!) : endOfMonth(new Date());
    
    // Correction : on récupère les segments en tant que string[]
    const selectedSegments = searchParams.get("segments")?.split(",") || [];
    
    // 3. Fetch des données réelles Odoo
    const { data, isLoading, isError, refetch } = useArpuData({ from, to }, selectedSegments);

    if (isLoading) return <DashboardSkeleton />;

     // Handler pour mettre à jour les segments (appelé par la toolbar)
    const handleSegmentsChange = (newSegments: string[]) => {
        const params = new URLSearchParams(searchParams);
        if (newSegments.length > 0) {
            params.set("segments", newSegments.join(","));
        } else {
            params.delete("segments");
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
        <DashboardHeader onExport={(format) => toast(`Export ${format} en cours...`)} />

        <ArpuToolbar 
            segments={initialMetadata.segments} // ["Enfant", "Femme", "Beauty"]
            selectedSegments={selectedSegments}
            onSegmentsChange={handleSegmentsChange}
            compareMode={compareMode}
            onCompareModeChange={setCompareMode}
        />


        <ArpuKpiGrid 
            stats={{
            arpu: data?.globalArpu || 0,
            revenue: data?.totalRevenue || 0,
            customers: data?.totalCustomers || 0
            }} 
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
                {/* APPEL CORRIGÉ : On passe les données temporelles et le mix des segments */}
                <ArpuAnalytics 
                    chartData={data?.chartData || []} 
                    segmentsMix={data?.segmentsMix || {}} 
                />
            </div>
            <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Insights Stratégiques</h3>
                <div className="space-y-4">
                    <InsightCard 
                        type="positive" 
                        text={`L'ARPU moyen sur la période est de ${(data?.globalArpu || 0).toFixed(2)} $ par mobile unique.`} 
                    />
                    <InsightCard 
                        type={data?.totalCustomers! < 10 ? "warning" : "positive"} 
                        text={`Base de données : ${data?.totalCustomers || 0} clients identifiés via téléphone.`} 
                    />
                </div>
            </div>
            {/* Section Distribution */}
                <ArpuDistribution data={data?.segmentsMix || {}} />
            
            </div>
        </div>

        {/* <ArpuTable data={data?.customerList || []} /> */}
        <ArpuMonthlyMatrix data={data?.yearlySummary || []} />
        </div>
    );
}

function InsightCard({ type, text }: { type: 'positive' | 'warning', text: string }) {
  return (
    <div className={`p-4 rounded-2xl border text-sm ${type === 'positive' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
      {text}
    </div>
  );
}

function ArpuDistribution({ data }: { data: Record<string, { revenue: number; percent: number }> }) {
  // On transforme l'objet en tableau pour itérer
  const entries = Object.entries(data);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Revenue Mix par Segment</h3>
        <div className="space-y-4">
            {entries.length > 0 ? (
                entries.map(([name, stats]) => (
                    <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-300">{name}</span>
                            <span className="text-indigo-600">{stats.percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.percent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-indigo-500 rounded-full" 
                            />
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                    Aucune donnée de segment disponible sur cette période.
                </p>
            )}
        </div>
    </div>
  )
}