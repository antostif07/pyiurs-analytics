import { Database } from "./database.types";

// 1. Types de base des tables
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type DocumentColumn = Database["public"]["Tables"]["document_columns"]["Row"]
export type SubColumn = Database["public"]["Tables"]["sub_columns"]["Row"]
export type CellData = Database["public"]["Tables"]["cell_data"]["Row"]
export type DocumentRow = Database["public"]["Tables"]["document_rows"]["Row"]
export type FileAttachment = Database["public"]["Tables"]["file_attachments"]["Row"]
export type MultilineData = Database["public"]["Tables"]["multiline_data"]["Row"]
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Attendance = Database["public"]["Tables"]["attendances"]["Row"]
export type Shop = Database["public"]["Tables"]["shops"]["Row"]

// Employee
export type Employee = Database["public"]["Tables"]["employees"]["Row"]
export type InsertEmployee = Database["public"]["Tables"]["employees"]["Insert"]
export type EmployeeRow = TableRow<'employees'>;
export type ShopRow = TableRow<'shops'>;
export type AttendanceRow = TableRow<'attendances'>;
export type ProfileRow = TableRow<'profiles'>;
export type PayslipRow = TableRow<'payslips'>;
export type EmployeeWithShop = EmployeeRow & {
  shops: Pick<ShopRow, 'id' | 'name'> | null;
};

// Attendance
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"]
export type AttendanceWithEmployee = AttendanceRow & {
  employees: EmployeeRow & {
    shops: Pick<ShopRow, 'id' | 'name'> | null;
  };
};
export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  "present": "Présent",
  "absent": "Absent",
  "late": "Retard",
  "repos": "Repos",
  "conge_circonstanciel": "Congé Circonstanciel",
  "conge_non_circonstanciel": "Congé non Circonstanciel",
  "suspension": "Suspension",
  "sick": "Maladie / Sick"
};

// Payroll
export type PaySlip = Database["public"]["Tables"]["payslips"]["Row"]

export type BonusWithEmployee = Database["public"]["Tables"]["employee_bonuses"]["Row"] & {
  employees: Pick<Database["public"]["Tables"]["employees"]["Row"], "id" | "name" | "matricule" | "job_title" | "shop_id"> & {
    shops: Pick<Database["public"]["Tables"]["shops"]["Row"], "id" | "name"> | null;
  };
};

export type DebtWithEmployee = Database["public"]["Tables"]["employee_debts"]["Row"] & {
  employees: Pick<Database["public"]["Tables"]["employees"]["Row"], "id" | "name" | "matricule" | "job_title" | "shop_id"> & {
    shops: Pick<Database["public"]["Tables"]["shops"]["Row"], "id" | "name"> | null;
  };
};


export type BonusRow = Database["public"]["Tables"]["employee_bonuses"]["Row"];
export type DebtRow = Database["public"]["Tables"]["employee_debts"]["Row"];
export type PayslipBatchRow = Database["public"]["Tables"]["payslip_batches"]["Row"];