import AnalyseBeautyTable from "../components/AnalyseBeautyTable";
import DateSelector from "../components/DateSelector";
import { getDataAnalyseByProductData } from "../actions";

export default async function ByProduct({ searchParams }: { searchParams: Promise<{month?: string; year?: string;}> }) {
    const params = await searchParams
    const month = params.month || ((new Date()).getMonth() + 1).toString();
    const year = params.year || (new Date().getFullYear()).toString();

    const products = await getDataAnalyseByProductData(month, year);

    const currentMonthName = new Date(Number(year), Number(month) - 1).toLocaleString("fr-FR",{ month: "long" });
    const prevMonthName = new Date(Number(year), Number(month) - 2).toLocaleString("fr-FR",{ month: "long" });
    const prev2MonthName = new Date(Number(year), Number(month) - 3).toLocaleString("fr-FR",{ month: "long" });

    return (
        <div className="min-h-screen pb-10">
        
            <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Analyse par produit</h1>
                        {/* <p className="text-gray-500 mt-1">
                            Réduction: <span className="font-bold text-red-600">-{campaign.discount_percent}%</span> 
                            • Produits: {details.length}
                        </p> */}
                    </div>
                    {/* BOUTON EXCEL */}
                    {/* <ExportButton campaignName={campaign.product_name} data={details} /> */}
                </div>
            </div>
            <DateSelector /> {/* Client Component OK */}

            <AnalyseBeautyTable
                data={products}
                months={{
                    current: currentMonthName,
                    previous: prevMonthName,
                    previous2: prev2MonthName,
                }}
            />

        </div>
    );
}
