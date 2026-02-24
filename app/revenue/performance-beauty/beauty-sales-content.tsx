import { getBeautySixMonthSales } from "../actions";
import { BeautyTrendTable } from "@/components/revenue/beauty-trend-table";

export default async function BeautySalesContent({ month, year, filters }: { 
    month: string, year: string,
    filters: { q?: string, color?: string, category?: string, partner?: string }
}) {
    const { clients, columns } = await getBeautySixMonthSales(month, year, filters);
    
    return <BeautyTrendTable data={clients} months={columns} />;
}