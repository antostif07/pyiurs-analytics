// app/hr/employees/new/page.tsx
import { getOdooHRData } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import EmployeeForm from "../_components/EmployeeForm";

export default async function NewEmployeePage() {
  const supabase = await createClient();
  
  // Récupération parallèle des données de référence
  const [shopsRes, odooData] = await Promise.all([
    supabase.from('shops').select('id, name').order('name'),
    getOdooHRData()
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fiche Collaborateur</h1>
        <p className="text-slate-500">Créez ou modifiez un profil employé avec liaison ERP.</p>
      </div>
      
      <EmployeeForm 
        shops={shopsRes.data || []} 
        odooEmployees={odooData.employees} 
        odooProducts={odooData.products} 
      />
    </div>
  );
}