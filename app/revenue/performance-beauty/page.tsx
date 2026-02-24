import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { format } from "date-fns";
import { Suspense } from "react";
import Loader from "@/components/loader";
import BeautySalesContent from "./beauty-sales-content";
import RevenueSmart from "@/components/revenue/revenue-smart";

export default async function BeautySalesTrendPage({ searchParams }: any) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    const filters = {
        q: params.q,
        color: params.color,
        category: params.category,
        partner: params.partner
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="flex-1 w-full space-y-4">
                    <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Trend <span className="text-rose-600">Beauty</span> 6 Mois
                    </h1>
                    <RevenueSmart segment="Beauty" />
                </div>
                <RevenueDateFilter />
            </div>
            <Suspense key={`${month}-${year}`} fallback={<Loader placeholder="Chargement des données de performance..." />}>
                <BeautySalesContent month={month} year={year} filters={filters} />
            </Suspense>
        </div>
    );
}