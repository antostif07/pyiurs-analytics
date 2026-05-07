"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Target, RefreshCw, UserPlus, ArrowUpRight, MoreHorizontal } from "lucide-react";
import { getCRMDashboardData } from "./actions";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";

export default function CRMDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: () => getCRMDashboardData(),
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
            CRM <span className="text-indigo-600">Overview</span>
          </h1>
          <p className="text-slate-500 font-medium">Gestion de la relation client et performance de rétention</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all">
            Exporter Data
          </button>
          <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Nouveau Client
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Clients" 
          value={data?.kpis.totalCustomers} 
          icon={Users} 
          trend="+12% ce mois"
          color="indigo" 
        />
        <StatCard 
          label="Nouveaux Clients" 
          value={data?.kpis.newCustomers} 
          icon={UserPlus} 
          trend="Mois en cours"
          color="blue" 
        />
        <StatCard 
          label="Taux de Rétention" 
          value={`${data?.kpis.retentionRate}%`} 
          icon={RefreshCw} 
          trend="Cible: 80%" 
          isTarget={true}
          targetReached={data?.kpis.retentionRate! >= 80}
          color="emerald" 
        />
        <StatCard 
          label="Opp. Actives" 
          value={data?.kpis.activeLeads} 
          icon={Target} 
          trend="Pipeline"
          color="purple" 
        />
      </div>

      {/* MIDDLE SECTION: RETENTION FOCUS & SEGMENTATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Retention Widget (The 80% Goal) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black italic uppercase">Analyse de Récurrence</h3>
              <p className="text-slate-500 text-sm font-medium">Cohorte Mois Précédent vs Mois Actuel</p>
            </div>
            <div className={`px-4 py-2 rounded-2xl font-black text-sm ${data?.kpis.retentionRate! >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {data?.kpis.retentionRate}% / 80%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="text-5xl font-black tracking-tighter">{data?.retention.returned}</div>
                <div className="text-slate-400 font-bold pb-1 uppercase text-sm">Clients Revenus</div>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span>Progression Objectif</span>
                  <span>{data?.kpis.retentionRate}%</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${data?.kpis.retentionRate! >= 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(data?.kpis.retentionRate!, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium italic">
                * Pour atteindre 80%, il manque encore {Math.max(0, Math.ceil(data?.retention.totalRef! * 0.8) - data?.retention.returned!)} clients à faire revenir.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider">Récapitulatif Cohorte</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Base (Mois dernier)</span>
                <span className="font-bold">{data?.retention.totalRef}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Revenus ce mois</span>
                <span className="font-bold text-emerald-500">{data?.retention.returned}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-bold">Taux actuel</span>
                <span className={`font-black ${data?.kpis.retentionRate! >= 80 ? 'text-emerald-500' : 'text-indigo-600'}`}>
                   {data?.kpis.retentionRate!}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Quick Links / Segment Info */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
          <div className="relative z-10 space-y-6">
            <h3 className="text-xl font-black italic uppercase">Actions CRM</h3>
            <div className="space-y-3">
              <ActionButton label="Relancer les clients inactifs" />
              <ActionButton label="Voir les clients VIP" />
              <ActionButton label="Rapport de prospection" />
            </div>
          </div>
          <RefreshCw className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 transform rotate-12 group-hover:rotate-45 transition-transform duration-700" />
        </div>
      </div>
    </div>
  );
}

// COMPOSANTS UI RÉUTILISABLES
function StatCard({ label, value, icon: Icon, trend, color, isTarget, targetReached }: any) {
  const colorMap: any = {
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  };

  return (
    <div className="p-7 bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-indigo-300 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-3xl font-black tracking-tighter italic">{value ?? "..." }</h3>
          {isTarget && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${targetReached ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {targetReached ? 'Objectif OK' : 'Sous Objectif'}
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
           <ArrowUpRight className="w-3 h-3 text-emerald-500" /> {trend}
        </p>
      </div>
    </div>
  );
}

function ActionButton({ label }: { label: string }) {
  return (
    <button className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 border border-white/10 rounded-[1.5rem] text-left text-sm font-bold backdrop-blur-sm transition-all flex justify-between items-center group/btn">
      {label}
      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all" />
    </button>
  );
}