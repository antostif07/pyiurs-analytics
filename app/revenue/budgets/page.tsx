import { Metadata } from "next";
import { getBudgetsData } from "./budget-actions";
import { BudgetFormDialog } from "./budget-form-dialog";
import { BudgetTable } from "./budget-table";
import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { format, getDaysInMonth } from "date-fns";
import { Target, Wallet } from "lucide-react";

interface PageProps {
    searchParams: Promise<{ month?: string; year?: string }>;
}

export const metadata: Metadata = {
    title: "Configuration des Budgets | Pyiurs Analytics",
    description: "Gestion et allocation des budgets de revenus mensuels.",
};

export default async function BudgetManagementPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const now = new Date();

    const monthStr = params.month || format(now, "MM");
    const yearStr = params.year || format(now, "yyyy");

    const monthInt = parseInt(monthStr, 10);
    const yearInt = parseInt(yearStr, 10);
    const selectedDate = new Date(yearInt, monthInt - 1, 1);

    const daysInMonth = getDaysInMonth(selectedDate);

    // Charger les budgets et les boutiques depuis Supabase
    const { budgets, shops } = await getBudgetsData(monthInt, yearInt);

    // Calcul du budget mensuel total configuré
    const totalConfiguredBudget = budgets.reduce(
        (sum, b) => sum + (Number(b.target_amount) || 0),
        0
    );

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-300">

            {/* 1. EN-TÊTE AVEC BOUTON D'AJOUT ET FILTRE DE DATE */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
                        Gestion des <span className="text-primary font-black">Budgets</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-light mt-1">
                        Allocation des objectifs financiers du mois {monthStr}/{yearStr} ({daysInMonth} jours).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <BudgetFormDialog
                        currentMonth={monthInt}
                        currentYear={yearInt}
                        shops={shops}
                    />
                    <RevenueDateFilter />
                </div>
            </div>

            {/* 2. STATISTIQUES RAPIDES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Total Budget Mensuel
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            ${totalConfiguredBudget.toLocaleString("en-US")}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted text-foreground">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Objectifs Configurés
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                            {budgets.length} Entité{budgets.length > 1 ? "s" : ""}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TABLEAU DES BUDGETS */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Budgets Alloués — {monthStr}/{yearStr}
                </h2>
                <BudgetTable budgets={budgets} daysInMonth={daysInMonth} />
            </div>

        </div>
    );
}