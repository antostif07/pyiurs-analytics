// app/hr/attendance/page.tsx
import { createClient } from '@/lib/supabase/server';
import { FileUp, Plus, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AttendanceDashboard from './_components/attendance-dashboard';
import Link from 'next/link';
import { EmployeeWithShop } from './_components/attendance-dashboard';

export type Shop = {
  id: string;
  name: string;
};

export default async function AttendancePage() {
  const supabase = await createClient();

  let shops: Shop[] = [];
  let employees: EmployeeWithShop[] = [];
  let error: string | null = null;

  try {
    // Récupérer les boutiques
    const { data: shopsData, error: shopsError } = await supabase
      .from('shops')
      .select('id, name')
      .order('name');

    if (shopsError) throw shopsError;
    shops = shopsData ?? [];

    // Récupérer les employés actifs avec leurs boutiques
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        shop_id,
        is_active,
        shops (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('name') as unknown as { data: EmployeeWithShop[]; error: any } | { data: null; error: any };

    if (employeesError) throw employeesError;
    employees = employeesData ?? [];

  } catch (err: any) {
    console.error('[ATTENDANCE_PAGE_ERROR]', err);
    error = "Impossible de charger les données";
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
              <CalendarCheck size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Opérations RH
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Registre des{" "}
            <span className="text-slate-400 font-light">Présences</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/hr/attendance/import" className="flex-1 md:flex-none">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all gap-2"
            >
              <FileUp size={16} /> Importer Machine
            </Button>
          </Link>

          <Button
            className="flex-1 md:flex-none h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-200 transition-all gap-2 px-6"
          >
            <Plus size={18} /> Pointage Manuel
          </Button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {/* DASHBOARD */}
      <AttendanceDashboard 
        shops={shops}
        initialEmployees={employees} currentUser={null}      />
    </div>
  );
}