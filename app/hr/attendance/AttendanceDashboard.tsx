'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Check, ShieldCheck, MessageSquare, 
  Calendar as CalendarIcon, Loader2, Save, User as UserIcon,
  MapPin,
  CheckCircle2
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { format, endOfMonth, startOfMonth, eachDayOfInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AttendanceStatus } from '../types'

const STATUS_OPTIONS = [
  { val: 'present', label: 'Présent' },
  { val: 'absent', label: 'Absent' },
  { val: 'late', label: 'Retard' },
  { val: 'repos', label: 'Repos' },
  { val: 'congé circonstaciel', label: 'C. Circonstanciel' },
  { val: 'congé non circonstaciel', label: 'C. Non Circonstanciel' },
  { val: 'suspension', label: 'Suspension' },
];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  'present': { 
    label: 'PRÉSENT', 
    className: 'bg-emerald-500 text-white border-emerald-600' 
  },
  'absent': { 
    label: 'ABSENT', 
    className: 'bg-red-500 text-white border-red-600' 
  },
  'late': { // La clé est 'late' comme en base, le label reste 'RETARD'
    label: 'RETARD', 
    className: 'bg-amber-500 text-white border-amber-600' 
  },
  'repos': { 
    label: 'REPOS', 
    className: 'bg-slate-400 text-white border-slate-500' 
  },
  'congé circonstaciel': { 
    label: 'C. CIRCONS.', 
    className: 'bg-indigo-500 text-white border-indigo-600' 
  },
  'congé non circonstanciel': { 
    label: 'C. NON CIRC.', 
    className: 'bg-pink-500 text-white border-pink-600' 
  },
  'suspension': { 
    label: 'SUSPENSION', 
    className: 'bg-gray-900 text-white border-black' 
  },
};

export default function AttendanceDashboard({ shops }: { shops: any[] }) {
    const supabase = createClient()
    
    // États
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [employees, setEmployees] = useState<any[]>([])
    const [attendances, setAttendances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const currentYear = new Date().getFullYear();
    const years = Array.from(
        { length: currentYear - 2018 + 1 }, 
        (_, i) => (currentYear - i).toString()
    );
  
    // Filtres
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'))
    const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'))
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
    const [selectedShopId, setSelectedShopId] = useState<string>("all");
    const filteredEmployees = employees.filter(e => 
        selectedShopId === "all" || e.shop_id === selectedShopId
    );

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        if (selectedEmployeeId) fetchEmployeeMonthlyData()
    }, [selectedEmployeeId, selectedMonth, selectedYear])

    const fetchInitialData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setCurrentUser(profile)
        }

        const { data: emps } = await supabase.from('employees').select('*, shops(name)').eq('is_active', true).order('name')
        if (emps) {
            setEmployees(emps)
            if (emps.length > 0) setSelectedEmployeeId(emps[0].id)
        }
    }

  const fetchEmployeeMonthlyData = async () => {
    setLoading(true)
    const start = `${selectedYear}-${selectedMonth}-01`
    const end = format(endOfMonth(new Date(`${selectedYear}-${selectedMonth}-01`)), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('attendances')
      .select('*')
      .eq('employee_id', selectedEmployeeId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    setAttendances(data || [])
    setLoading(false)
  }

  // --- ACTIONS ---

  const handleUpdateLine = async (id: string, updates: any) => {
    const { error } = await supabase.from('attendances').update(updates).eq('id', id)
    if (!error) fetchEmployeeMonthlyData()
  }

  const canConfirm = (empUserId: string) => 
    currentUser?.role === 'admin' || currentUser?.id === empUserId

  const canValidate = (empShopId: string) => 
    currentUser?.role === 'admin' || (currentUser?.role === 'manager' && currentUser?.assigned_shops?.includes(empShopId))

  return (
    <div className="space-y-6">
        {/* BARRE DE PÉRIODE & SELECTEUR EMPLOYE */}
        <Card className="p-3 lg:py-3 lg:px-5 border-none shadow-sm rounded-2xl bg-white flex flex-col lg:flex-row gap-3 items-center">
            {/* BLOC DATE : MOIS & ANNÉE (Plus compact) */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-full lg:w-auto border border-gray-100">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full lg:w-[110px] h-8 border-none bg-transparent font-bold text-xs shadow-none focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">
                                {format(new Date(2025, i, 1), 'MMMM', { locale: fr })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <div className="w-px h-4 bg-gray-200 hidden lg:block" /> {/* Séparateur visuel */}

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full lg:w-[80px] h-8 border-none bg-transparent font-bold text-rose-600 text-xs shadow-none focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                            <SelectItem key={year} value={year} className="text-xs">
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* BLOC BOUTIQUE (Hauteur réduite à h-10) */}
            <div className="w-full lg:w-56">
                <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                    <SelectTrigger className="w-full h-10 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-xs focus:ring-1 focus:ring-rose-500/20">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            <SelectValue placeholder="Toutes les boutiques" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Toutes les boutiques</SelectItem>
                        {shops.map((shop) => (
                            <SelectItem key={shop.id} value={shop.id} className="text-xs">
                                {shop.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* BLOC EMPLOYÉ (Flex-1 pour prendre le reste de la place) */}
            <div className="flex-1 w-full">
                <Select 
                    value={selectedEmployeeId} 
                    onValueChange={setSelectedEmployeeId}
                >
                    <SelectTrigger className="w-full h-10 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-xs focus:ring-1 focus:ring-rose-500/20">
                        <div className="flex items-center gap-2">
                            <UserIcon size={14} className="text-gray-400" />
                            <SelectValue placeholder="Sélectionner un employé" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((e) => (
                                <SelectItem key={e.id} value={e.id} className="text-xs">
                                    {e.name} <span className="ml-2 text-[10px] text-gray-400 font-normal">({e.shops?.name || "Sans site"})</span>
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-400 italic">
                                Aucun employé trouvé
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>
        </Card>

        {/* SYNTHÈSE MENSUELLE */}
        {!loading && attendances.length > 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
            <MonthlySummary attendances={attendances} />
            </div>
        )}

        {/* TABLEAU DE VALIDATION MENSUELLE */}
      <Card className="border-none shadow-sm rounded-[40px] bg-white overflow-hidden min-h-[600px]">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Analyse du mois...</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <th className="px-6 py-5">Jour</th>
                            <th className="px-4 py-5 text-center">Heure</th>
                            <th className="px-4 py-5 text-center">Status Machine</th>
                            <th className="px-4 py-5">Status à Valider</th>
                            <th className="px-4 py-5">Observations</th>
                            <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {attendances.map((row) => {
                            const emp = employees.find(e => e.id === row.employee_id)
                            return (
                                <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors ${row.is_validated ? 'bg-emerald-50/20' : ''}`}>
                                    <td className="px-6 py-4 font-bold text-gray-500">
                                        {format(new Date(row.date), 'dd eee', { locale: fr })}
                                    </td>
                                    <td className="px-4 py-4 text-center font-mono font-bold text-gray-900">
                                        {row.check_in || '—'}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <StatusBadge status={row.status} />
                                    </td>
                                    <td className="px-4 py-1">
                                        <Select 
                                            disabled={row.is_validated}
                                            value={row.validated_status || row.status} 
                                            onValueChange={(val) => handleUpdateLine(row.id, { validated_status: val as AttendanceStatus })}
                                        >
                                            <SelectTrigger className="h-7 rounded-lg border-gray-100 bg-gray-50 font-bold text-[9px] min-w-[130px] shadow-none">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="z-[100]">
                                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                                    <SelectItem key={key} value={key} className="text-[10px] font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.className.split(' ')[0]}`} />
                                                            {cfg.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="relative group">
                                            <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                            <Input 
                                                disabled={row.is_validated}
                                                placeholder="Note..." 
                                                className="h-9 pl-9 rounded-xl border-gray-100 bg-gray-50 text-xs focus:bg-white"
                                                value={row.observation || ''}
                                                onBlur={(e) => handleUpdateLine(row.id, { observation: e.target.value })}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-1 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={row.is_confirmed || !canConfirm(emp?.user_id)}
                                                onClick={() => handleUpdateLine(row.id, { is_confirmed: true, confirmed_by: currentUser.id })}
                                                className={`h-7 px-2 rounded-lg text-[9px] font-black ${row.is_confirmed ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}
                                            >
                                                {row.is_confirmed ? <CheckCircle2 size={12} /> : 'Confirmer'}
                                            </Button>

                                            <Button
                                                size="sm"
                                                disabled={row.is_validated || !canValidate(emp?.shop_id)}
                                                onClick={() => handleUpdateLine(row.id, { 
                                                    is_validated: true, 
                                                    validated_by: currentUser.id,
                                                    validated_status: row.validated_status || row.status 
                                                })}
                                                className={`h-7 px-2 rounded-lg text-[9px] font-black uppercase ${row.is_validated ? 'bg-gray-100 text-gray-400' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                                            >
                                                {row.is_validated ? <ShieldCheck size={12} /> : 'Valider'}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </Card>
    </div>
  )
}

function MonthlySummary({ attendances }: { attendances: any[] }) {
  // Calcul des totaux basés sur le statut validé (ou le statut machine si non validé)
  const stats = (Object.keys(STATUS_CONFIG) as AttendanceStatus[]).reduce((acc, statusKey) => {
    acc[statusKey] = attendances.filter(a => 
      (a.is_validated ? a.validated_status : a.status) === statusKey
    ).length;
    return acc;
  }, {} as Record<AttendanceStatus, number>);

  const totalDays = attendances.length;
  const validatedCount = attendances.filter(a => a.is_validated).length;
  const progress = totalDays > 0 ? (validatedCount / totalDays) * 100 : 0;

  return (
    <Card className="p-8 border-none shadow-xl rounded-[40px] bg-gray-900 text-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <CalendarIcon size={120} />
      </div>

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold">Synthèse de la période</h3>
            <p className="text-gray-400 text-sm">Basé sur les statuts finaux et validés</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Progression Validation</p>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-mono font-bold text-sm">{validatedCount}/{totalDays}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {STATUS_OPTIONS.map((status) => {
            const count = stats[status.val as AttendanceStatus] || 0;
            return (
              <div key={status.val} className={`p-4 rounded-3xl border ${count > 0 ? 'bg-white/5 border-white/10' : 'opacity-30 border-transparent'}`}>
                <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400 mb-1 truncate">
                  {status.label}
                </p>
                <p className={`text-2xl font-black ${count > 0 ? 'text-white' : 'text-gray-600'}`}>
                  {count}
                </p>
              </div>
            );
          })}
        </div>

        {/* Note pour la paie */}
        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-6">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-bold">Jours à rémunérer : <span className="text-emerald-400">{stats['present'] + (stats['repos'] || 0) + (stats['congé circonstaciel'] || 0)}</span></span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-xs font-bold">Dépassement / Retards : <span className="text-red-400">{stats['late']}</span></span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  // On cast 'status' en tant que AttendanceStatus pour l'indexation
  const config = STATUS_CONFIG[status as AttendanceStatus] || { 
    label: (status || 'INCONNU').toUpperCase(), 
    className: 'bg-gray-100 text-gray-400 border-gray-200' 
  };

  return (
    <Badge className={`${config.className} text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border shadow-sm whitespace-nowrap`}>
      {config.label}
    </Badge>
  );
}