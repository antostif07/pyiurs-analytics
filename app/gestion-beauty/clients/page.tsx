import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Suspense } from "react";
import BeautyKPIs from "./components/BeautyKPIs";
import KPIsSkeleton from "./components/KPIsSkeleton";
import ClientTable from "./components/ClientTable";
import { getBeautyClientsData } from "./actions";

export default async function BeautyClientsPage({ searchParams }: { searchParams: any }) {
    const {clients, productOptions} = await getBeautyClientsData();
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">
                    Portefeuille Clients <span className="text-rose-600">Beauty</span>
                </h1>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Analyse en temps réel</p>
            </div>
            <Suspense fallback={<KPIsSkeleton />}>
                <BeautyKPIs />
            </Suspense>

            <Suspense fallback={
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[32px] border border-gray-100 shadow-sm">
                    <Loader2 className="animate-spin text-rose-500 mb-4" />
                    <p className="text-xs font-black uppercase text-gray-400">Consolidation du registre client...</p>
                </div>
            }>
                <ClientTable initialData={clients} productOptions={productOptions} />
            </Suspense>
        </div>
    );
}

function FilterSelect({ placeholder, options }: { placeholder: string, options: string[] }) {
    return (
        <Select>
            <SelectTrigger className="h-10 px-4 rounded-xl bg-gray-50/50 border-gray-100 font-bold text-[10px] uppercase tracking-wider w-[160px]">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
        </Select>
    )
}