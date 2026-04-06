// app/hr/attendance/types.ts

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'repos'
  | 'sick'
  | 'congé circonstaciel'
  | 'congé non circonstanciel'
  | 'suspension'

export type Employee = {
  id: string
  name: string
  shop_id: string
  user_id: string
  shops?: { name: string }
}

export type Attendance = {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  status: AttendanceStatus
  validated_status?: AttendanceStatus | null
  is_confirmed: boolean
  is_validated: boolean
  observation?: string | null
  validated_by?: string
  confirmed_by?: string
}