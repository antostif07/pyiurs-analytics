import { Suspense } from "react";
import { format } from "date-fns";
import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import FemmeSalesContent from "./femme-sales-content";
import Loader from "@/components/loader";

export default async function FemmeSalesPage({ searchParams }: any) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    return (
        <div className="space-y-8 pb-10">
            {/* Header et Filtres s'affichent instantanément */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Performance <span className="text-pink-600">Collection Femme</span>
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">
                        Analyse par HS_CODE & COULEUR • Revenu 6 Mois
                    </p>
                </div>
                <RevenueDateFilter />
            </div>

            {/* Le tableau est "suspendu" pendant le chargement des données d'Odoo */}
            <Suspense key={`${month}-${year}`} fallback={<Loader placeholder="Chargement des données de performance..." />}>
                <FemmeSalesContent month={month} year={year} />
            </Suspense>
        </div>
    );
}