import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPayrollPreparationData } from "./_actions";
import { getShops } from "../../actions";
import PreparationClient from "./preparation-client";
import { FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    shopId?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const now = new Date();
  const m = params?.month || String(now.getMonth() + 1).padStart(2, "0");
  const y = params?.year || String(now.getFullYear());

  return {
    title: `Préparation de la Paie (${m}/${y}) | Pyiurs Enterprise`,
    description: "Calcul de la masse salariale, arbitrage des primes et consolidation des déductions d'avances.",
  };
}

export default async function PayrollPreparationPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  // 1. Contrôle de session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirectTo=/hr/payroll/preparation");
  }

  // 2. Contrôle RBAC (Finance / RH / Direction uniquement)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["admin", "financier", "manager"];
  if (!profile || !allowedRoles.includes(profile.role || "")) {
    redirect("/hr");
  }

  const params = await searchParams;
  const now = new Date();
  const currentMonth = parseInt(params?.month || String(now.getMonth() + 1), 10);
  const currentYear = parseInt(params?.year || String(now.getFullYear()), 10);
  const currentShop = params?.shopId || "all";

  // 3. Récupération des données et des boutiques
  const [data, shops] = await Promise.all([
    getPayrollPreparationData(currentMonth, currentYear, currentShop),
    getShops(),
  ]);

  return (
    <div className="space-y-6 w-full">
      {/* En-tête Métier */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Préparation & Clôture de la Paie
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 gap-1.5 py-0.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{String(currentMonth).padStart(2, "0")}/{currentYear}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Consolidation mensuelle : Salaires de base, primes, retenues sur absences et amortissement des avances.
          </p>
        </div>
      </div>

      {/* Interface Interactive Client */}
      <PreparationClient
        batch={data.batch}
        initialPayslips={data.payslips}
        currentMonth={String(currentMonth).padStart(2, "0")}
        currentYear={String(currentYear)}
        currentShop={currentShop}
        shops={shops}
        userRole={profile.role || "user"}
      />
    </div>
  );
}