// app/hr/employees/page.tsx
import { Suspense } from "react";
import { Plus, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmployeeList from "./_components/EmployeeList";
import { getEmployees } from "./_actions/get-employees";
import { TableSkeleton } from "./_components/table-skeleton";
import Link from "next/link";

export const metadata = {
  title: "Effectif Personnel | RH Module",
};

interface PageProps {
  searchParams: Promise<{
    query?: string;
    page?: string;
    shop?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.query || "";
  const page = Number(params.page) || 1;
  const shop = params.shop || "all";

  return (
    <div className="space-y-7">
      {/* HEADER STRATÉGIQUE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ressources Humaines</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Effectif <span className="text-slate-400 font-light">Personnel</span></h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all gap-2">
            <Download size={16} /> Exporter
          </Button>
          <Button className="flex-1 md:flex-none h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200 transition-all gap-2 px-6">
            <Link href="/hr/employees/new">
              <Plus size={18} /> Nouveau Collaborateur
            </Link>
          </Button>
        </div>
      </div>

      {/* ZONE DE LISTE AVEC SUSPENSE */}
      <Suspense key={query + page + shop} fallback={<TableSkeleton />}>
        <EmployeeListWrapper query={query} page={page} shop={shop} />
      </Suspense>
    </div>
  );
}

// Wrapper pour isoler le fetch de données
async function EmployeeListWrapper({ query, page, shop }: { query: string; page: number; shop: string }) {
  const { data, totalCount } = await getEmployees({ query, page, shop });
  
  return (
    <EmployeeList 
      initialData={data} 
      totalCount={totalCount} 
      currentPage={page} 
    />
  );
}