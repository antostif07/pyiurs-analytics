'use client';

import { Card } from "@/components/ui/card";
import { 
  Users, 
  CheckCircle2, 
  UserMinus, 
  AlertCircle, 
  ArrowRight,
  CalendarDays,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OverviewClient({ data, currentRange }: { data: any, currentRange: string }) {
  const router = useRouter();

  const setRange = (range: string) => {
    router.push(`/hr?range=${range}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER AVEC FILTRE DE TEMPS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tableau de Bord <span className="text-rose-600">RH</span></h1>
          <p className="text-sm text-slate-500 font-medium">Aperçu opérationnel et financier</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setRange('today')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${currentRange === 'today' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Aujourd'hui
          </button>
          <button 
            onClick={() => setRange('month')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${currentRange === 'month' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Ce Mois
          </button>
        </div>
      </div>

      {/* CARTES KPI PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Effectif Actif" 
          value={data.stats.totalEmployees} 
          icon={<Users className="text-blue-600" />} 
          color="bg-blue-50"
        />
        <StatCard 
          title="Présents" 
          value={data.stats.presentToday} 
          subValue={`Sur ${data.stats.totalEmployees}`}
          icon={<CheckCircle2 className="text-emerald-600" />} 
          color="bg-emerald-50"
        />
        <StatCard 
          title="Absents" 
          value={data.stats.absentsToday} 
          icon={<UserMinus className="text-rose-600" />} 
          color="bg-rose-50"
          alert={data.stats.absentsToday > 0}
        />
        <StatCard 
          title="À Valider" 
          value={data.stats.pendingValidation} 
          icon={<AlertCircle className="text-amber-600" />} 
          color="bg-amber-50"
          alert={data.stats.pendingValidation > 0}
        />
      </div>

      {/* SECTION ACTIONS ET ALERTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : TÂCHES URGENTES */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Clock size={16} /> Actions Prioritaires
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionLink 
              title="Valider les présences" 
              desc={`${data.stats.pendingValidation} pointages en attente de décision`}
              href="/hr/attendance"
              icon={<CalendarDays className="text-rose-600" />}
            />
            <ActionLink 
              title="Préparer la paie" 
              desc="Vérifier les primes et retenues de Janvier"
              href="/hr/payroll"
              icon={<Clock className="text-blue-600" />}
            />
          </div>
        </div>

        {/* COLONNE DROITE : RÉCAPITULATIF RAPIDE */}
        <Card className="p-6 border-none shadow-sm rounded-xl bg-slate-900 text-white flex flex-col justify-between">
            <div>
                <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Statut de la Paie</h3>
                <p className="text-2xl font-bold">Janvier 2025</p>
                <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Clôture présences</span>
                        <BadgeCheck className="text-emerald-400" size={16} />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Calcul des primes</span>
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                </div>
            </div>
            
            <Link href="/hr/payroll" className="mt-8">
                <Button className="w-full bg-white text-slate-900 hover:bg-rose-50 rounded-2xl font-bold text-xs">
                    VOIR LE RÉCAPITULATIF
                </Button>
            </Link>
        </Card>
      </div>
    </div>
  );
}

// Sous-composants locaux pour garder le code propre
function StatCard({ title, value, icon, color, subValue, alert }: any) {
  return (
    <Card className={`p-6 border-none shadow-sm rounded-xl bg-white transition-all hover:shadow-md ${alert ? 'ring-2 ring-rose-100' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-slate-900">{value}</h4>
            {subValue && <span className="text-xs text-slate-400 font-bold">{subValue}</span>}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{title}</p>
      </div>
    </Card>
  );
}

function ActionLink({ title, desc, href, icon }: any) {
    return (
        <Link href={href}>
            <Card className="p-5 border-none shadow-sm rounded-2xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white transition-colors">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
                    </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
            </Card>
        </Link>
    )
}

function BadgeCheck({ className, size }: any) {
    return (
        <div className={`bg-emerald-500/10 p-1 rounded-full ${className}`}>
            <CheckCircle2 size={size} />
        </div>
    )
}