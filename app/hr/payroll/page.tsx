import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet,
  FileSpreadsheet,
  History,
  BadgeCent,
  ArrowRight,
  ShieldCheck,
  ClockAlert,
  CalendarDays,
  Sparkles,
} from "lucide-react";

// ✅ Composants Shadcn UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPayrollStats } from "../actions";
import { PayrollFilter } from "../_components/payroll-filter";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const now = new Date();
  const m = params?.month || String(now.getMonth() + 1).padStart(2, "0");
  const y = params?.year || String(now.getFullYear());

  return {
    title: `Pilotage Paie (${m}/${y}) | Pyiurs Enterprise`,
    description: "Analyse globale de la masse salariale, suivi des validations et clôture mensuelle.",
  };
}

export default async function PayrollDashboard({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  const month = params?.month || String(now.getMonth() + 1).padStart(2, "0");
  const year = params?.year || String(now.getFullYear());

  // Récupération des statistiques consolidées
  const stats = await getPayrollStats(parseInt(month, 10), parseInt(year, 10));
  const monthLabel = new Date(parseInt(year, 10), parseInt(month, 10) - 1).toLocaleString("fr-FR", {
    month: "long",
  });

  const pendingCount = Math.max(0, stats.totalEmployees - stats.validatedCount);
  const isCompleted = stats.progress === 100 && stats.totalEmployees > 0;

  return (
    <div className="space-y-8 w-full">
      {/* 1. EN-TÊTE AVEC FILTRE TEMPOREL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tableau de Bord Paie
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 gap-1 py-0.5 capitalize">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{monthLabel} {year}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Supervision de la masse salariale nette, suivi des validations boutique et clôture mensuelle.
          </p>
        </div>

        {/* Composant Sélecteur Mois / Année */}
        <PayrollFilter />
      </div>

      {/* 2. CARTES KPIS EXÉCUTIVES (SHADCN UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Masse Salariale Nette */}
        <Card className="border border-border/80 bg-card shadow-xs relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Masse Salariale Nette
                </span>
                <p className="text-3xl font-bold font-mono text-foreground mt-1.5">
                  ${stats.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-light">
                Bulletins validés & calculés
              </span>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-semibold gap-1">
                <ShieldCheck className="w-3 h-3" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Progression des Validations */}
        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Avancement de Clôture
                </span>
                <p className="text-3xl font-bold font-mono text-foreground mt-1.5">
                  {stats.validatedCount}{" "}
                  <span className="text-lg text-muted-foreground font-normal">/ {stats.totalEmployees}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl border bg-primary/10 border-primary/20 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Barre de Progression Shadcn */}
            <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5">
              <div className="flex justify-between text-[11px] text-muted-foreground font-light">
                <span>Validation bulletins</span>
                <span className="font-mono font-medium text-foreground">{stats.progress}%</span>
              </div>
              <Progress value={stats.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Fiches Restantes à Clôturer */}
        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  En Attente d'Arbitrage
                </span>
                <p className={`text-3xl font-bold font-mono mt-1.5 ${pendingCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {pendingCount}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl border ${pendingCount > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"}`}>
                <ClockAlert className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-light">
                {pendingCount > 0 ? "Fiches en cours de préparation" : "Tous les bulletins sont clôturés"}
              </span>
              {isCompleted && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                  100% Clôturé
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. NAVIGATION VERS LES 3 MODULES DE PAIE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: "Préparation Paie",
            icon: FileSpreadsheet,
            href: "/hr/payroll/preparation",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            desc: "Consolidation des 26 jours, calcul des retards > 9h, pénalités absences et transport.",
          },
          {
            title: "Bulletins Validés",
            icon: History,
            href: "/hr/payroll/payslips",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            desc: "Fiches de paie définitives, génération des fiches individuelles et exports PDF.",
          },
          {
            title: "Primes & Dettes",
            icon: BadgeCent,
            href: "/hr/payroll/bonuses",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            desc: "Attribution des primes mensuelles et gestion des échéances d'avances sur salaire.",
          },
        ].map((m) => (
          <Link key={m.href} href={`${m.href}?month=${month}&year=${year}`} className="group">
            <Card className="border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all rounded-xl p-5 h-full flex flex-col justify-between cursor-pointer">
              <div className="space-y-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${m.bg} ${m.border} ${m.color} group-hover:scale-105 transition-transform`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {m.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-light">
                    {m.desc}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                <span>Accéder au module</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}