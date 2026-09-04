import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileSpreadsheet, CalendarDays } from "lucide-react";

// ✅ Import du client interactif et des types stricts
import AttendanceClient from "./attendance-client";
import { getMonthlyAttendance, getShops } from "../actions";

// ✅ Composants Shadcn UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceWithEmployee, ProfileRow, ShopRow } from "@/lib/supabase/types";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    query?: string;
    shopId?: string;
  }>;
}

// ✅ Génération dynamique des métadonnées selon le mois et l'année consultés
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const now = new Date();
  const month = params?.month || String(now.getMonth() + 1).padStart(2, "0");
  const year = params?.year || String(now.getFullYear());

  return {
    title: `Pointages & Présences (${month}/${year}) | Pyiurs Enterprise`,
    description: "Contrôle des présences boutique, suivi des retards et validation des jours travaillés pour la paie.",
  };
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const supabase = await createClient();

  // 1. Contrôle de session utilisateur côté serveur
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/hr/attendance");
  }

  // 2. Récupération typée du profil avec rôle et boutiques assignées
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, assigned_shops")
    .eq("id", user.id)
    .single();

  const userProfile: Pick<ProfileRow, "id" | "full_name" | "email" | "role" | "assigned_shops"> | null = profile;

  // 3. Gestion des filtres temporels
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params?.month || String(now.getMonth() + 1).padStart(2, "0");
  const currentYear = params?.year || String(now.getFullYear());
  const currentShop = params?.shopId || "all";

  // 4. Récupération parallèle strictement typée (SSR)
  let initialAttendanceData: {
    attendances: AttendanceWithEmployee[];
    stats?: Record<string, unknown>;
  } = {
    attendances: [],
  };

  let shopsList: Pick<ShopRow, "id" | "name">[] = [];

  try {
    const [attendanceRes, shopsRes] = await Promise.all([
      getMonthlyAttendance(currentMonth, currentYear, currentShop),
      getShops(),
    ]);

    initialAttendanceData = {
      attendances: Array.isArray(attendanceRes)
        ? (attendanceRes as unknown as AttendanceWithEmployee[])
        : ((attendanceRes as any)?.attendances as AttendanceWithEmployee[]) || [],
      stats: (attendanceRes as any)?.stats || undefined,
    };

    shopsList = (shopsRes as Pick<ShopRow, "id" | "name">[]) || [];
  } catch (error) {
    console.error("Erreur lors du chargement des présences SSR:", error);
  }

  return (
    <div className="space-y-6 w-full">
      {/* En-tête Métier avec Actions Clés */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestion des Présences & Pointages
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 gap-1.5 py-0.5">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{currentMonth}/{currentYear}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Contrôle quotidien des arrivées, suivi des retards boutique et validation des jours travaillés pour la paie.
          </p>
        </div>

        {/* Bouton d'Import de Fichier Biométrique / Excel */}
        <div className="flex items-center gap-2.5">
          <Button variant="outline" asChild className="h-9 text-xs gap-2 border-dashed shadow-xs">
            <Link href="/hr/attendance/import">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importer Registre Excel</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Zone Interactive Client avec Suspense */}
      <Suspense fallback={<AttendanceGridSkeleton />}>
        <AttendanceClient
          initialData={initialAttendanceData}
          currentUser={user}
          userProfile={userProfile}
          currentMonth={currentMonth}
          currentYear={currentYear}
          currentShop={currentShop}
          shops={shopsList}
        />
      </Suspense>
    </div>
  );
}

/**
 * Skeleton de chargement adapté à une matrice de présence mensuelle
 */
function AttendanceGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Barre de filtres skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-56 rounded-lg" />
      </div>

      {/* Tableau skeleton */}
      <div className="border border-border rounded-xl bg-card p-4 space-y-3">
        <div className="flex justify-between border-b pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <div className="flex-1 flex gap-1.5 overflow-hidden">
              {Array.from({ length: 20 }).map((_, j) => (
                <Skeleton key={j} className="h-7 w-7 rounded shrink-0" />
              ))}
            </div>
            <Skeleton className="h-7 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}