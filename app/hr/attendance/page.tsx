import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AttendanceClient from "./attendance-client";
import { getMonthlyAttendance, getShops } from "../actions";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    query?: string;
    shopId?: string;
  }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. Gérer les filtres de date
  const params = await searchParams;
  const currentMonth = params.month || String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYear = params.year || String(new Date().getFullYear());
  const currentShop = params.shopId || "all";
  
  // 3. Récupérer les données (Employés + Pointages du mois)
  const [data, shops] = await Promise.all([
    getMonthlyAttendance(currentMonth, currentYear, currentShop),
    getShops()
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Statif */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gestion des Présences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contrôlez, confirmez et validez les pointages issus des terminaux biométriques.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild className="rounded-xl border-dashed">
            <Link href="/hr/attendance/import">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
              Importer Excel
            </Link>
          </Button>
        </div>
      </div>

      {/* Zone Interactive (Client) */}
      <Suspense fallback={<LoadingState />}>
        <AttendanceClient 
          initialData={data} 
          currentUser={user} 
          currentMonth={currentMonth}
          currentYear={currentYear}
          currentShop={currentShop}
          shops={shops}
        />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin mb-2" />
      <p className="text-sm">Chargement des présences...</p>
    </div>
  );
}