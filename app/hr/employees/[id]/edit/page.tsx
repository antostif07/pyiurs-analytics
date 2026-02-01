import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EmployeeForm from '../../EmployeeForm'

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!employee) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Modifier : {employee.name}</h1>
      <EmployeeForm initialData={employee} />
    </div>
  )
}