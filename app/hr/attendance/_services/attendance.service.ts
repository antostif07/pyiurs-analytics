// app/hr/attendance/_services/attendance.service.ts

import { createClient } from '@/lib/supabase/client'
import { Attendance } from '../types'

const supabase = createClient()

export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*, shops(name)')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}

export async function getAttendances(
  employeeId: string,
  start: string,
  end: string
) {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', start)
    .lte('date', end)
    .order('date')

  if (error) throw error
  return data as Attendance[]
}

export async function updateAttendance(
  id: string,
  updates: Partial<Attendance>
) {
  const { error } = await supabase
    .from('attendances')
    .update(updates as never)
    .eq('id', id)

  if (error) throw error
}