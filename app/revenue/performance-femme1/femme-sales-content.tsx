import { FemmeTrendTable } from "@/components/revenue/femme-trend-table";
import { getFemmeSixMonthSales } from "../actions";

export default async function FemmeSalesContent({ month, year }: { month: string, year: string }) {
    const {products, columns} = await getFemmeSixMonthSales(month, year);
    
    return <FemmeTrendTable data={products} months={columns} />;
}