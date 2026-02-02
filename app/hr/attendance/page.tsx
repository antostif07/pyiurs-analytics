import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AttendanceDashboard from './AttendanceDashboard'

export default async function AttendancePage() {
  const supabase = await createClient()

  // On récupère les boutiques pour pouvoir filtrer par site
  const { data: shops } = await supabase.from('shops').select('id, name').order('name')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Registre des Présences</h1>
          <p className="text-sm text-gray-500 font-medium">Suivi quotidien et historique des pointages</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/hr/attendance/import">
            <Button variant="outline" className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 gap-2 font-bold h-11">
              <FileUp size={18} />
              Importer Machine
            </Button>
          </Link>
          <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl gap-2 font-bold h-11">
            <Plus size={18} />
            Pointage Manuel
          </Button>
        </div>
      </div>

      {/* Le dashboard interactif (Client Component) */}
      <AttendanceDashboard shops={shops || []} />
    </div>
  )
}