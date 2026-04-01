'use client';

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, CheckCircle2, UserMinus, AlertCircle, 
  ArrowRight, CalendarDays, Clock, TrendingUp 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HROverviewData } from "../types";

interface OverviewProps {
  data: HROverviewData;
  currentRange: string;
}

export default function OverviewClient({ data, currentRange }: OverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setRange = (range: string) => {
    startTransition(() => {
      router.push(`/hr?range=${range}`, { scroll: false });
    });
  };

  return (
    <div className={cn(
      "space-y-8 transition-opacity duration-300",
      isPending ? "opacity-50 pointer-events-none" : "opacity-100"
    )}>
      
      {/* HEADER STRATÉGIQUE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">
              Live Ops
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard <span className="text-slate-400 font-light">RH</span>
          </h1>
        </div>

        {/* Sélecteur de période stylisé */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          {['today', 'month'].map((range) => (
            <button
              key={range}
              onClick={() => setRange(range)}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                currentRange === range 
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {range === 'today' ? "Aujourd'hui" : "Ce Mois"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI GRID - Avec logique métier intégrée */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Effectif Total" 
          value={data.stats.totalEmployees} 
          icon={<Users size={20} />} 
          variant="blue"
          trend="+2.5%"
        />
        <StatCard 
          title="Présence" 
          value={`${Math.round((data.stats.presentToday / data.stats.totalEmployees) * 100)}%`}
          subValue={`${data.stats.presentToday} actifs`}
          icon={<CheckCircle2 size={20} />} 
          variant="emerald"
        />
        <StatCard 
          title="Absences" 
          value={data.stats.absentsToday} 
          icon={<UserMinus size={20} />} 
          variant="rose"
          alert={data.stats.absentsToday > 5}
        />
        <StatCard 
          title="Validations" 
          value={data.stats.pendingValidation} 
          icon={<AlertCircle size={20} />} 
          variant="amber"
          alert={data.stats.pendingValidation > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTIONS PRIORITAIRES */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
            <Clock size={14} /> Workflow en attente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard 
              title="Pointages" 
              desc={`${data.stats.pendingValidation} à approuver`}
              href="/hr/attendance"
              icon={<CalendarDays />}
              count={data.stats.pendingValidation}
            />
            <ActionCard 
              title="Paie & Primes" 
              desc="Générer le rapport de fin de mois"
              href="/hr/payroll"
              icon={<TrendingUp />}
            />
          </div>
        </div>

        {/* WIDGET PAIE - Focus financier */}
        <Card className="relative overflow-hidden border-none bg-slate-900 text-white p-6 shadow-xl">
            <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest">Finances</p>
                        <h3 className="text-xl font-bold italic">Payroll <span className="text-slate-400">Status</span></h3>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                        <Clock className="text-rose-400" size={18} />
                    </div>
                </div>

                <div className="space-y-5 flex-1">
                    <PayrollStep label="Clôture Présences" completed={data.payrollStatus.isAttendanceClosed} />
                    <PayrollStep label="Calcul des Primes" completed={data.payrollStatus.isBonusesCalculated} />
                </div>
                
                <Button asChild className="w-full mt-8 bg-rose-600 hover:bg-rose-500 text-white border-none rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <a href="/hr/payroll">OUVRIR LA SESSION</a>
                </Button>
            </div>
            {/* Décoration subtile en arrière-plan */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-rose-600/10 rounded-full blur-3xl" />
        </Card>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS (À déplacer idéalement dans des fichiers séparés) ---

function StatCard({ title, value, icon, variant, subValue, alert, trend }: any) {
  const variants: any = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  };

  return (
    <Card className={cn(
      "p-5 border-none shadow-sm rounded-2xl transition-all hover:shadow-md group",
      alert && "ring-2 ring-rose-500 ring-offset-2"
    )}>
      <div className="flex justify-between items-center mb-3">
        <div className={cn("p-2.5 rounded-xl transition-colors", variants[variant])}>
          {icon}
        </div>
        {trend && (
           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
             {trend}
           </span>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
            {subValue && <span className="text-xs text-slate-400 font-medium">{subValue}</span>}
        </div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
    </Card>
  );
}

function ActionCard({ title, desc, href, icon, count }: any) {
  return (
    <a href={href} className="group block">
      <Card className="p-4 border border-slate-100 bg-white hover:border-rose-200 hover:shadow-lg hover:shadow-rose-500/5 transition-all rounded-2xl">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    {count && <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md">{count}</span>}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{desc}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-rose-500 transition-transform group-hover:translate-x-1" />
        </div>
      </Card>
    </a>
  );
}

function PayrollStep({ label, completed }: { label: string, completed: boolean }) {
    return (
        <div className="flex justify-between items-center group">
            <span className={cn("text-xs transition-colors", completed ? "text-slate-400" : "text-white font-medium")}>
                {label}
            </span>
            {completed ? (
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                </div>
            ) : (
                <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
            )}
        </div>
    );
}