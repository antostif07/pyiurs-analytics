import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { SupplierPerformanceClient } from "./supplier-performance-client";
import { format } from "date-fns";

interface PageProps {
    searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function SupplierPerformancePage({ searchParams }: PageProps) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    return (
        <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            {/* En-tête Métier Pur */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
                        Performance <span className="text-primary">Fournisseurs & Marques</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-light mt-1">
                        Analyse comparative du chiffre d'affaires, du volume d'achats, du stock et de la marge brute (6 mois glissants).
                    </p>
                </div>
                <RevenueDateFilter />
            </div>

            <SupplierPerformanceClient month={month} year={year} />
        </div>
    );
}