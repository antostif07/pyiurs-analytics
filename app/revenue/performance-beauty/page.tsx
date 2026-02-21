import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { format } from "date-fns";
import { getBeautySixMonthSales } from "../actions";
import { BeautyTrendTable } from "@/components/revenue/beauty-trend-table";

export default async function BeautySalesTrendPage({ searchParams }: any) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    const { clients, columns } = await getBeautySixMonthSales(month, year);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Trend <span className="text-rose-600">Beauty</span> 6 Mois
                    </h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        Analyse comparative glissante ($ USD)
                    </p>
                </div>
                <RevenueDateFilter />
            </div>

            <BeautyTrendTable data={clients} months={columns} />
        </div>
    );
}