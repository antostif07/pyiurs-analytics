export type AttendanceStatus = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'repos' 
  | 'congé circonstaciel' 
  | 'congé non circonstanciel' 
  | 'suspension'
  | 'sick';

export type DateRange = 'today' | 'week' | 'month' | 'year';

export const ALLOWED_RANGES: DateRange[] = ['today', 'week', 'month', 'year'];

export interface HROverviewData {
  stats: {
    totalEmployees: number;
    presentToday: number;
    absentsToday: number;
    pendingValidation: number;
    trends?: { // Optionnel pour l'instant
      employees: number; 
      absenteeism: number;
    }
  };
  payrollStatus: {
    month: string;
    isAttendanceClosed: boolean;
    isBonusesCalculated: boolean;
    progress: number;
  };
}

export type ActionResponse<T> = {
  data: T | null;
  error: string | null;
  timestamp: string;
};

import { Database } from "@/lib/supabase/database.types";

// Type de base de la table
export type DbEmployee = Database['public']['Tables']['employees']['Row'];
export type DbShop = Database['public']['Tables']['shops']['Row'];

// Type composé pour l'UI (Employé + sa boutique)
export interface EmployeeWithRelations extends DbEmployee {
  shops: Pick<DbShop, 'name' | 'odoo_company_id'> | null;
}
