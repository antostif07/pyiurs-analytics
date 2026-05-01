// app/hr/shops/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getOdooCompanies } from "../actions";
import ShopList from "./_components/ShopList";
import { Store } from "lucide-react";

export default async function ShopsPage() {
  const supabase = await createClient();
  
  // Fetch parallèle (Performance)
  const [shopsRes, odooCompanies] = await Promise.all([
    supabase.from('shops').select('*').order('name'),
    getOdooCompanies()
  ]);

  return (
    <div className="space-y-7">
      {/* HEADER COORDONNÉ (Identique à EmployeesPage) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
              <Store size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Infrastructure</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Gestion des <span className="text-slate-400 font-light">Boutiques</span>
          </h1>
        </div>
      </div>
      <ShopList 
        initialShops={shopsRes.data || []} 
        odooCompanies={odooCompanies} 
      />
    </div>
  );
}