import { SearchParamsProps } from "@/app/types/app";
import { format } from "date-fns";

export default async function Page({ searchParams }: SearchParamsProps) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");
    
    const filters = {
        q: params.q,
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 p-4">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="flex-1 w-full space-y-4">
                    <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Performance <span className="text-rose-600">Fournisseur</span> 6 Mois
                    </h1>

                    <div className="max-w-3xl">
                        {/* <RevenueSmartFilter                        
                            categories={filterOptions.categories}
                            colors={filterOptions.colors}
                            brands={filterOptions.brands}
                            // suppliers={filterOptions.suppliers} // Si vous l'ajoutez
                        /> */}
                    </div>
                </div>
                {/* <RevenueDateFilter /> */}
            </div>
            {/* <SupplierSalesContent month="06" year="2024" data={[]} /> */}
        </div>
    );
}