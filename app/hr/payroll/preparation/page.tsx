import { createClient } from "@/lib/supabase/server";
import { getPayrollPrepData } from "../../actions";
import PayrollPrepClient from "./payroll-prep-client";

export default async function PayrollPreparationPage({ searchParams }: any) {
  const params = await searchParams;
  const month = parseInt(params.month || String(new Date().getMonth() + 1));
  const year = parseInt(params.year || String(new Date().getFullYear()));
  const shopId = params.shopId || "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Chargement parallèle des données et des boutiques
  const [employeesData, shops] = await Promise.all([
    getPayrollPrepData(month, year, shopId),
    supabase.from('shops').select('id, name').order('name')
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Préparation de la Paie</h1>
          <p className="text-sm text-muted-foreground italic">
            Révision des calculs avant clôture mensuelle.
          </p>
        </div>
      </div>

      <PayrollPrepClient 
        initialEmployees={employeesData} 
        shops={shops.data || []}
        currentUser={user}
        month={month}
        year={year}
        shopId={shopId}
      />
    </div>
  );
}