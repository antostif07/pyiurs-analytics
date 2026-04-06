// app/hr/attendance/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type AttendanceWithEmployee = {
  id: string;
  date: string;
  status: string;
  is_confirmed: boolean;
  is_validated: boolean;
  validated_status: string | null;
  validated_at: string | null;
  employee_id: string;
  employee: {
    id: string;
    name: string;
    shop_id: string;
    shops: {
      id: string;
      name: string;
    };
  };
};

export async function fetchAttendances(
  employeeId: string,
  year: string,
  month: string
) {
  try {
    const supabase = await createClient();

    const start = `${year}-${month}-01`;
    const end = new Date(`${year}-${month}-01`);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    const endDate = format(end, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('attendances')
      .select(`
        *,
        employee:employees (
          id,
          name,
          shop_id,
          shops:shops (
            id,
            name
          )
        )
      `)
      .eq('employee_id', employeeId)
      .gte('date', start)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching attendances:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAttendance(id: string, updates: any) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('attendances')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/hr/attendance');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    return { success: false, error: error.message };
  }
}

export async function bulkValidateAttendances(ids: string[]) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('attendances')
      .update({
        is_validated: true,
        validated_at: new Date().toISOString(),
        // validated_status: supabase.raw('status')
      })
      .in('id', ids);

    if (error) throw error;

    revalidatePath('/hr/attendance');
    return { success: true };
  } catch (error: any) {
    console.error('Error bulk validating:', error);
    return { success: false, error: error.message };
  }
}

// Helper pour formater la date
function format(date: Date, formatStr: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}