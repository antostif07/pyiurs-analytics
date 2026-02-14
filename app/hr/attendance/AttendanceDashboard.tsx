'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Check, ShieldCheck, MessageSquare, 
  Calendar as CalendarIcon, Loader2, Save, User as UserIcon,
  MapPin, CheckCircle2, Printer, Star
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { format, endOfMonth, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AttendanceStatus } from '../types'
import { STATUS_CONFIG } from '../utils'
import { generateAttendancePDF } from './exportPDF'

const STATUS_OPTIONS = [
  { val: 'present', label: 'Présent' },
  { val: 'absent', label: 'Absent' },
  { val: 'late', label: 'Retard' },
  { val: 'repos', label: 'Repos' },
  { val: 'sick', label: 'Maladie' },
  { val: 'congé circonstaciel', label: 'C. Circonstanciel' },
  { val: 'congé non circonstanciel', label: 'C. Non Circonstanciel' },
  { val: 'suspension', label: 'Suspension' },
];

export default function AttendanceDashboard({ shops }: { shops: any[] }) {
    const supabase = createClient()
    
    // États
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [employees, setEmployees] = useState<any[]>([])
    const [attendances, setAttendances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // Filtres
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'))
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
    const [selectedShopId, setSelectedShopId] = useState<string>("all");

    const years = useMemo(() => Array.from({ length: new Date().getFullYear() - 2018 + 1 }, (_, i) => (new Date().getFullYear() - i).toString()), []);
    
    // 1️⃣ FILTRAGE DES DONNÉES (Ignorer les dimanches partout)
    const workingDaysAttendances = useMemo(() => {
        return attendances.filter(a => getDay(new Date(a.date)) !== 0);
    }, [attendances]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(e => selectedShopId === "all" || e.shop_id === selectedShopId);
    }, [employees, selectedShopId]);

    useEffect(() => { fetchInitialData() }, [])
    useEffect(() => { if (selectedEmployeeId) fetchEmployeeMonthlyData() }, [selectedEmployeeId, selectedMonth, selectedYear])

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

    const isFullyConfirmed = workingDaysAttendances.length > 0 && workingDaysAttendances.every(a => a.is_confirmed);

    const handlePrintPDF = () => {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        const stats = (Object.keys(STATUS_CONFIG) as AttendanceStatus[]).reduce((acc, statusKey) => {
            acc[statusKey] = workingDaysAttendances.filter(a => (a.is_validated ? a.validated_status : a.status) === statusKey).length;
            return acc;
        }, {} as any);
        generateAttendancePDF(emp, attendances, selectedMonth, selectedYear, stats);
    };

    const handleUpdateLine = async (id: string, updates: any) => {
        setUpdatingId(id);
        try {
            const { error } = await supabase.from('attendances').update(updates).eq('id', id);
            if (error) throw error;
            await fetchEmployeeMonthlyData(); 
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const canConfirm = (empUserId: string) => currentUser?.role === 'admin' || currentUser?.id === empUserId;
    const canValidate = (empShopId: string) => currentUser?.role === 'admin' || (currentUser?.role === 'manager' && currentUser?.assigned_shops?.includes(empShopId));

    return (
        <div className="space-y-6">
            {/* TOOLBAR COMPACTE */}
            <Card className="p-3 lg:py-3 lg:px-5 border-none shadow-sm rounded-2xl bg-white flex flex-col lg:flex-row gap-3 items-center">
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-full lg:w-auto border border-gray-100">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-full lg:w-27.5 h-8 border-none bg-transparent font-bold text-xs shadow-none focus:ring-0 uppercase">
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
                    <div className="w-px h-4 bg-gray-200 hidden lg:block mx-1" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full lg:w-20 h-8 border-none bg-transparent font-bold text-rose-600 text-xs shadow-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(year => <SelectItem key={year} value={year} className="text-xs">{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                    <SelectTrigger className="w-full lg:w-48 h-10 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-xs">
                        <MapPin size={14} className="mr-2 text-gray-400" />
                        <SelectValue placeholder="Boutique" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Tous les sites</SelectItem>
                        {shops.map(shop => <SelectItem key={shop.id} value={shop.id} className="text-xs">{shop.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <div className="flex-1 w-full">
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger className="w-full h-10 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-xs uppercase italic tracking-tighter">
                            <UserIcon size={14} className="mr-2 text-gray-400" />
                            <SelectValue placeholder="Employé" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredEmployees.map(e => (
                                <SelectItem key={e.id} value={e.id} className="text-xs uppercase font-bold tracking-tighter italic">
                                    {e.name} <span className="ml-2 text-[9px] text-gray-400 font-normal">({e.shops?.name})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrintPDF} disabled={!isFullyConfirmed} className="h-9 rounded-xl border-gray-200 text-gray-700 font-bold text-[10px] uppercase">
                        <Printer size={14} className="mr-2" /> PDF
                    </Button>
                    <Button size="sm" disabled={isBulkLoading || loading || workingDaysAttendances.every(a => a.is_validated)} onClick={() => {/* bulk validate logic */}} className="h-9 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest px-4">
                        Tout Valider
                    </Button>
                </div>
            </Card>

            {/* RÉSUMÉ MENSUEL (Working days only) */}
            {!loading && workingDaysAttendances.length > 0 && (
                <MonthlySummary attendances={workingDaysAttendances} />
            )}

            {/* GRILLE DE POINTAGE (Sans les dimanches) */}
            <Card className="border-none shadow-sm rounded-4xl bg-white overflow-hidden min-h-125">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Calcul des jours ouvrés...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Jour</th>
                                    <th className="px-4 py-4 text-center">Arrivée</th>
                                    <th className="px-4 py-4 text-center">Source</th>
                                    <th className="px-4 py-4">Status Retenu</th>
                                    <th className="px-4 py-4">Observations</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {workingDaysAttendances.map((row) => {
                                    const emp = employees.find(e => e.id === row.employee_id)
                                    return (
                                        <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors h-11 ${row.is_validated ? 'bg-emerald-50/5' : ''}`}>
                                            <td className="px-6 py-1 font-bold text-gray-500 text-[11px] italic">
                                                {format(new Date(row.date), 'dd eee', { locale: fr })}
                                            </td>
                                            <td className="px-4 py-1 text-center font-mono font-bold text-gray-900 text-[11px]">
                                                {row.check_in || '—'}
                                            </td>
                                            <td className="px-4 py-1 text-center">
                                                <StatusBadge status={row.status} />
                                            </td>
                                            <td className="px-4 py-1">
                                                <Select 
                                                    disabled={row.is_validated}
                                                    value={row.validated_status || row.status} 
                                                    onValueChange={(val) => handleUpdateLine(row.id, { validated_status: val as AttendanceStatus })}
                                                >
                                                    <SelectTrigger className="h-7 rounded-lg border-gray-100 bg-gray-50 font-bold text-[9px] min-w-32.5 shadow-none uppercase italic">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-100">
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.val} value={opt.val} className="text-[10px] font-bold uppercase italic">
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-4 py-1">
                                                <Input 
                                                    disabled={row.is_validated}
                                                    placeholder="Justification..." 
                                                    className="h-7 rounded-lg border-transparent bg-gray-50/50 text-[10px] focus:bg-white transition-all shadow-none italic font-medium"
                                                    defaultValue={row.observation || ''}
                                                    onBlur={(e) => handleUpdateLine(row.id, { observation: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-6 py-1 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="sm" variant="ghost"
                                                        disabled={row.is_confirmed || !canConfirm(emp?.user_id) || updatingId === row.id}
                                                        onClick={() => handleUpdateLine(row.id, { is_confirmed: true, confirmed_by: currentUser.id })}
                                                        className={`h-7 px-2 rounded-lg text-[9px] font-black uppercase ${row.is_confirmed ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}
                                                    >
                                                        {updatingId === row.id ? <Loader2 size={10} className="animate-spin" /> : row.is_confirmed ? 'OK' : 'Confirmer'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        disabled={row.is_validated || !canValidate(emp?.shop_id) || updatingId === row.id}
                                                        onClick={() => handleUpdateLine(row.id, { is_validated: true, validated_by: currentUser.id, validated_status: row.validated_status || row.status })}
                                                        className={`h-7 px-2 rounded-lg text-[9px] font-black uppercase ${row.is_validated ? 'bg-gray-100 text-gray-400' : 'bg-rose-600 text-white'}`}
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
    const stats = (Object.keys(STATUS_CONFIG) as AttendanceStatus[]).reduce((acc, statusKey) => {
        acc[statusKey] = attendances.filter(a => (a.is_validated ? a.validated_status : a.status) === statusKey).length;
        return acc;
    }, {} as Record<AttendanceStatus, number>);

    const totalDays = attendances.length;
    const validatedCount = attendances.filter(a => a.is_validated).length;
    const progress = totalDays > 0 ? (validatedCount / totalDays) * 100 : 0;

    return (
        <Card className="p-6 border-none shadow-xl rounded-4xl bg-gray-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><CalendarIcon size={100} /></div>
            <div className="relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div><h3 className="text-lg font-black italic uppercase tracking-tighter">Synthèse Mensuelle</h3><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Hors Dimanches</p></div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-1">Progression</p>
                        <div className="flex items-center gap-3"><div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${progress}%` }} /></div><span className="font-mono font-bold text-xs">{validatedCount}/{totalDays}</span></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {STATUS_OPTIONS.map((status) => {
                        const count = stats[status.val as AttendanceStatus] || 0;
                        return (
                            <div key={status.val} className={`p-3 rounded-2xl border ${count > 0 ? 'bg-white/5 border-white/10' : 'opacity-20 border-transparent'}`}>
                                <p className="text-[8px] font-black uppercase tracking-tighter text-gray-400 mb-1 truncate">{status.label}</p>
                                <p className={`text-xl font-black ${count > 0 ? 'text-white' : 'text-gray-600'}`}>{count}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="pt-4 border-t border-white/5 flex gap-4">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold uppercase">Payés : {stats['present'] + (stats['repos'] || 0) + (stats['late'] || 0)}</span></div>
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[10px] font-bold uppercase">Déduits : {stats['absent'] + (stats['sick'] || 0)}</span></div>
                </div>
            </div>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as AttendanceStatus] || { label: status.toUpperCase(), className: 'bg-gray-100 text-gray-400' };
  return <Badge className={`${config.className} text-[8px] font-black px-2 py-0.5 rounded-full border-none shadow-none uppercase tracking-tighter italic`}>{config.label}</Badge>;
}