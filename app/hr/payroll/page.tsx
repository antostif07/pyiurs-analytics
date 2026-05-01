// app/hr/payroll/page.tsx
import { Card } from "@/components/ui/card";
import { Wallet, FileSpreadsheet, History, BadgeCent, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getPayrollStats } from "../actions";
import { PayrollFilter } from "../_components/payroll-filter";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function PayrollDashboard({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = params.month || String(new Date().getMonth() + 1).padStart(2, '0');
  const year = params.year || String(new Date().getFullYear());

  const stats = await getPayrollStats(parseInt(month), parseInt(year));
  const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('fr-FR', { month: 'long' });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* HEADER AVEC FILTRE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tableau de Bord Paie</h1>
          <p className="text-muted-foreground italic first-letter:uppercase">Analyse de la paie • {monthLabel} {year}</p>
        </div>
        <PayrollFilter />
      </div>

      {/* KPI CARDS (Identiques à avant mais avec les stats filtrées) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-none shadow-sm bg-gray-900 text-white rounded-[32px] relative group overflow-hidden">
          <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          <p className="text-xs font-bold uppercase opacity-60">Masse Salariale Net</p>
          <h2 className="text-4xl font-black mt-2">{stats.totalNet.toLocaleString()} $</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">Validé</span>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm rounded-[32px] bg-white">
          <p className="text-xs font-bold uppercase text-muted-foreground">Progression</p>
          <h2 className="text-4xl font-black mt-2">{stats.validatedCount} / {stats.totalEmployees}</h2>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
            <div 
                className="bg-emerald-500 h-full transition-all duration-700" 
                style={{ width: `${stats.progress}%` }} 
            />
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm rounded-[32px] bg-rose-50 border border-rose-100">
          <p className="text-xs font-bold uppercase text-rose-600">Restant à Clôturer</p>
          <h2 className="text-4xl font-black mt-2 text-rose-700">{stats.totalEmployees - stats.validatedCount}</h2>
          <p className="text-[10px] text-rose-600/60 mt-4 font-bold italic uppercase tracking-wider">Fiches en attente</p>
        </Card>
      </div>

      {/* NAVIGATION MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Préparation Paie", icon: FileSpreadsheet, href: "/hr/payroll/preparation", color: "bg-blue-600", desc: "Calculs et pointages." },
          { title: "Bulletins validés", icon: History, href: "/hr/payroll/payslips", color: "bg-emerald-600", desc: "Historique et PDF." },
          { title: "Primes & Dettes", icon: BadgeCent, href: "/hr/payroll/bonuses", color: "bg-amber-600", desc: "Bonus et retenues." }
        ].map((m) => (
          <Link key={m.href} href={`${m.href}?month=${month}&year=${year}`}>
            <Card className="p-8 border-none shadow-sm hover:shadow-xl transition-all rounded-[40px] group bg-white flex flex-col h-full justify-between cursor-pointer">
              <div className="space-y-4">
                <div className={`${m.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <m.icon size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{m.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{m.desc}</p>
                </div>
              </div>
              <div className="mt-8 flex items-center text-xs font-bold gap-2 group-hover:gap-4 transition-all">
                Ouvrir le module <ArrowRight size={16} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}