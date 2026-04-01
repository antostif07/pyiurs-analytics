// app/hr/employees/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOdooHRData } from "../../../actions";
import EmployeeForm from "../../_components/EmployeeForm";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: EditPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Récupération parallèle : Employé + Shops + Odoo (Performance Max)
  const [employeeRes, shopsRes, odooData] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).single(),
    supabase.from('shops').select('id, name').order('name'),
    getOdooHRData()
  ]);

  if (employeeRes.error || !employeeRes.data) {
    notFound(); // Redirige vers la page 404 si l'ID n'existe pas
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Modifier le profil
        </h1>
        <p className="text-slate-500">
          Mise à jour des informations de <span className="text-slate-900 font-bold">{employeeRes.data.name}</span>
        </p>
      </div>
      
      <EmployeeForm 
        initialData={employeeRes.data} 
        shops={shopsRes.data || []} 
        odooEmployees={odooData.employees} 
        odooProducts={odooData.products} 
      />
    </div>
  );
}