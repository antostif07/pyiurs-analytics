import { Suspense } from "react";
import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { getSupplierPerformanceData } from "./supplier-actions";
import { SupplierTable } from "./supplier-table";
import Loader from "@/components/loader";
import { format } from "date-fns";

export default async function SupplierPerformancePage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>;
}) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    const { suppliers, columns } = await getSupplierPerformanceData(month, year);

    return (
        <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
                        Performance <span className="text-primary">Fournisseurs</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-light mt-1">
                        Analyse du chiffre d'affaires et des stocks des fournisseurs externes (6 Mois roulants).
                    </p>
                </div>
                <RevenueDateFilter />
            </div>

            <Suspense fallback={<Loader placeholder="Chargement des données fournisseurs..." />}>
                <SupplierTable suppliers={suppliers} columns={columns} />
            </Suspense>
        </div>
    );
}