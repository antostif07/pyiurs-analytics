import { Database } from "./database.types";

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
export type EmployeeWithShop = Employee & { shops: { name: string } | null }

// Attendance
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"]
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