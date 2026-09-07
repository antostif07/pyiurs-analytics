import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BonusesClient from "./bonuses-client";
import { getBonusesAndDebtsData } from "./_actions";
import { getShops } from "../../actions";
import { BadgeCent } from "lucide-react";
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
        title: `Primes & Avances sur Salaire (${m}/${y}) | Pyiurs Enterprise`,
        description: "Pilotage des primes exceptionnelles, encours de dettes et échéances de remboursement.",
    };
}

export default async function BonusesPage({ searchParams }: PageProps) {
    const supabase = await createClient();

    // Contrôle de session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login?redirectTo=/hr/payroll/bonuses");
    }

    // Vérification de rôle (Accessible uniquement à admin, manager, financier)
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, assigned_shops")
        .eq("id", user.id)
        .single();

    const allowedRoles = ["admin", "manager", "financier"];
    if (!profile || !allowedRoles.includes(profile.role || "")) {
        redirect("/hr");
    }

    const params = await searchParams;
    const now = new Date();
    const currentMonth = parseInt(params?.month || String(now.getMonth() + 1), 10);
    const currentYear = parseInt(params?.year || String(now.getFullYear()), 10);
    const currentShop = params?.shopId || "all";

    // Récupération simultanée des données, boutiques et agents actifs pour les modales
    const [data, shops, activeEmployeesRes] = await Promise.all([
        getBonusesAndDebtsData(currentMonth, currentYear, currentShop),
        getShops(),
        supabase
            .from("employees")
            .select("id, name, matricule, base_salary, shop_id, shops(id, name)")
            .eq("is_active", true)
            .order("name", { ascending: true }),
    ]);

    return (
        <div className="space-y-6 w-full">
            {/* En-tête Métier */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Primes, Avances & Dettes
                        </h1>
                        <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 gap-1.5 py-0.5">
                            <BadgeCent className="w-3.5 h-3.5" />
                            <span>{String(currentMonth).padStart(2, "0")}/{currentYear}</span>
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Attribution des bonus de performance boutique, suivi des avances sur salaire et amortissement des dettes.
                    </p>
                </div>
            </div>

            {/* Interface Interactive Client */}
            <BonusesClient
                initialBonuses={data.bonuses}
                initialDebts={data.debts}
                currentMonth={String(currentMonth).padStart(2, "0")}
                currentYear={String(currentYear)}
                currentShop={currentShop}
                shops={shops}
                employees={activeEmployeesRes.data || []}
                userRole={profile.role || "user"}
            />
        </div>
    );
}