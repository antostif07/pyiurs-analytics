'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  AlertCircle, Save, Loader2, Calendar, 
  ArrowRightLeft, Printer, FileDown, MapPin, 
  TrendingUp, Wallet, BadgeCheck, SearchX
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format, endOfMonth, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'

// Utils
import { MONTHS } from '../utils'
import { generateTransportPDF } from './exportTransportPDF'
import { generateFullPayslipPDF } from './exportFullPayslipPDF'
import { generateGlobalTransportPDF } from './exportGlobalTransportPDF'
import { toast } from 'sonner'

// --- CONSTANTES DE CALCUL ---
const PAYROLL_BASIS = 26; // Base fixe de 26 jours
const WORK_HOURS_PER_DAY = 8; // On divise la journée en 8h pour le ratio retard

export default function PayrollPage() {
    const supabase = createClient()
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => (currentYear - i).toString())

    // États
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState<string | null>(null) // ID de l'employé en cours de sauvegarde
    const [shops, setShops] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [hasAttendance, setHasAttendance] = useState(true)
    
    // Filtres
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'))
    const [selectedYear, setSelectedYear] = useState(currentYear.toString())
    const [selectedShopId, setSelectedShopId] = useState<string>('all')
    const [debtDeductions, setDebtDeductions] = useState<Record<string, number>>({})

    useEffect(() => {
        const fetchInitial = async () => {
            const { data } = await supabase.from('shops').select('*').order('name')
            if (data) setShops(data)
        }
        fetchInitial()
    }, [])

    const fetchPayrollData = useCallback(async () => {
        setLoading(true)
        const startDate = `${selectedYear}-${selectedMonth}-01`
        const endDate = format(endOfMonth(new Date(`${selectedYear}-${selectedMonth}-01`)), 'yyyy-MM-dd')

        let query = supabase
            .from('employees')
            .select(`
                *,
                shops(name),
                attendances(*),
                employee_bonuses(*),
                employee_debts(*),
                payslips(*)
            `)
            .eq('is_active', true)
            .order('name')

        if (selectedShopId !== 'all') {
            query = query.eq('shop_id', selectedShopId)
        }

        const { data: emps } = await query

        if (emps) {
            let totalLogsForMonth = 0;

            const processed = emps.map(emp => {
                const filteredAttendances = emp.attendances?.filter((a: any) => a.date >= startDate && a.date <= endDate) || []
                totalLogsForMonth += filteredAttendances.length;

                const filteredBonuses = emp.employee_bonuses?.filter((b: any) => b.month === parseInt(selectedMonth) && b.year === parseInt(selectedYear)) || []
                const activeDebts = emp.employee_debts?.filter((d: any) => d.status === 'active') || []
                const existingPayslip = emp.payslips?.find((p: any) => p.month === parseInt(selectedMonth) && p.year === parseInt(selectedYear))

                // --- LOGIQUE DE CALCUL COMPLEXE ---
                let totalSalaryDeduction = 0;
                let transportPenaltyDays = 0;

                filteredAttendances.forEach((log: any) => {
                    const isSunday = getDay(new Date(log.date)) === 0;
                    if (isSunday) return; // Le dimanche n'existe pas pour la paie

                    const status = log.validated_status || log.status;
                    const dailyRate = emp.base_salary / PAYROLL_BASIS;
                    const hourlyRate = dailyRate / WORK_HOURS_PER_DAY;

                    // A. Logique Salaire
                    if (status === 'late' && log.check_in) {
                        const hour = parseInt(log.check_in.split(':')[0]);
                        if (hour >= 9) {
                            const hoursPenalty = hour - 8; // 09h01 -> 1h, 10h01 -> 2h...
                            totalSalaryDeduction += hoursPenalty * hourlyRate;
                        }
                    } else if (status === 'sick' || status === 'congé circonstaciel') {
                        totalSalaryDeduction += dailyRate * 0.70; // On enlève 70% (Payé 30%)
                    } else if (['absent', 'congé non circonstanciel', 'suspension'].includes(status)) {
                        totalSalaryDeduction += dailyRate; // On enlève 100%
                    }

                    // B. Logique Transport (Seuls absences, malades, congés, suspensions sont déduits)
                    if (['absent', 'sick', 'congé circonstaciel', 'congé non circonstanciel', 'suspension'].includes(status)) {
                        transportPenaltyDays += 1;
                    }
                });

                const transportEligibleDays = Math.max(0, PAYROLL_BASIS - transportPenaltyDays);
                const netTransport = (emp.transport_allowance / PAYROLL_BASIS) * transportEligibleDays;
                const totalBonuses = filteredBonuses.reduce((acc: number, b: any) => acc + b.amount, 0);
                const totalDebtRemaining = activeDebts.reduce((acc: number, d: any) => acc + d.remaining_amount, 0);

                return {
                    ...emp,
                    penaltyDays: transportPenaltyDays,
                    transportEligibleDays,
                    netTransport,
                    totalSalaryDeduction,
                    totalBonuses,
                    totalDebtRemaining,
                    activeDebts,
                    isPaid: !!existingPayslip,
                    payslipData: existingPayslip || null,
                    filteredAttendances,
                    filteredBonuses
                }
            })

            setEmployees(processed)
            setHasAttendance(totalLogsForMonth > 0)
        }
        setLoading(false)
    }, [selectedMonth, selectedYear, selectedShopId, supabase])

    useEffect(() => {
        fetchPayrollData()
    }, [fetchPayrollData])

    // --- ACTIONS ---

    const handleProcessPayment = async (emp: any) => {
        const deductionValue = debtDeductions[emp.id] || 0;
        const netBeforeDebt = (emp.base_salary - emp.totalSalaryDeduction) + emp.netTransport + emp.totalBonuses;
        const totalNet = netBeforeDebt - deductionValue;

        setIsSaving(emp.id);
        try {
            const { data: payslip, error: pError } = await supabase.from('payslips').insert({
                employee_id: emp.id,
                month: parseInt(selectedMonth),
                year: parseInt(selectedYear),
                base_salary_snapshot: emp.base_salary,
                transport_allowance_paid: emp.netTransport,
                absences_deduction: emp.totalSalaryDeduction,
                bonuses_total: emp.totalBonuses,
                debt_deduction: deductionValue,
                net_paid: totalNet,
                status: 'paid'
            }).select().single();

            if (pError) throw pError;

            if (deductionValue > 0) {
                let remainingToDeduct = deductionValue;
                for (const debt of emp.activeDebts) {
                    if (remainingToDeduct <= 0) break;
                    const amount = Math.min(debt.remaining_amount, remainingToDeduct);
                    await supabase.from('employee_debts').update({
                        remaining_amount: debt.remaining_amount - amount,
                        status: (debt.remaining_amount - amount) <= 0 ? 'cleared' : 'active'
                    }).eq('id', debt.id);
                    remainingToDeduct -= amount;
                }
            }
            toast.success("Paiement validé");
            fetchPayrollData();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(null);
        }
    }

    return (
        <div className="space-y-6 pb-20">
            {/* HEADER FILTRES */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-4xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="bg-rose-50 p-3 rounded-2xl text-rose-600">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tighter italic uppercase">Clôture Paie</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Base 26 Jours • Ratio Retard 09:00</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                        <SelectTrigger className="w-44 h-10 rounded-xl bg-gray-50 border-none font-bold text-xs uppercase italic">
                            <MapPin size={14} className="mr-2 text-gray-400"/>
                            <SelectValue placeholder="Boutique" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les sites</SelectItem>
                            {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 items-center h-10">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-28 border-none bg-transparent font-bold text-xs shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="w-px h-4 bg-gray-200 mx-1" />
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-20 border-none bg-transparent font-bold text-rose-600 text-xs shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button 
                        onClick={() => generateGlobalTransportPDF(employees, selectedMonth, selectedYear, "Global")}
                        disabled={!hasAttendance}
                        className="bg-gray-900 hover:bg-black text-white rounded-xl font-bold h-10 px-4 gap-2"
                    >
                        <FileDown size={18} /> Rapport
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-40 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Calcul des enveloppes...</p>
                </div>
            ) : !hasAttendance ? (
                <Card className="p-20 text-center border-none shadow-sm rounded-[40px] bg-white text-gray-400">
                    <SearchX size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">Aucun pointage importé pour ce mois.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {employees.map((emp) => {
                        const totalNet = (emp.base_salary - emp.totalSalaryDeduction) + emp.netTransport + emp.totalBonuses - (debtDeductions[emp.id] || 0);

                        return (
                            <Card key={emp.id} className="p-0 border-none shadow-sm rounded-4xl bg-white overflow-hidden group border border-gray-100 transition-all hover:shadow-md">
                                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                                    
                                    {/* COL 1: IDENTITY & SALARY */}
                                    <div className="lg:col-span-3 p-6 border-r border-gray-50 bg-gray-50/30">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">
                                                {emp.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm leading-none mb-1">{emp.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">{emp.shops?.name}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                                                <span>Salaire Base</span>
                                                <span className="text-gray-900">{emp.base_salary} $</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-red-500">
                                                <span>Retenues Travail</span>
                                                <span>-{emp.totalSalaryDeduction.toFixed(2)} $</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COL 2: TRANSPORT */}
                                    <div className="lg:col-span-3 p-6 border-r border-gray-50">
                                        <div className="flex items-center gap-2 text-blue-600 mb-4 font-black uppercase text-[10px] italic">
                                            <ArrowRightLeft size={16} /> Enveloppe Transport
                                        </div>
                                        <p className="text-2xl font-black text-blue-700">{emp.netTransport.toFixed(2)} $</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                            {emp.transportEligibleDays}j payés / 26
                                        </p>
                                        <Button 
                                            variant="outline" size="sm" 
                                            onClick={() => generateTransportPDF(emp, selectedMonth, selectedYear, emp.transportEligibleDays, 26, emp.netTransport)}
                                            className="mt-4 w-full h-8 rounded-xl text-[9px] font-black border-blue-100 text-blue-600"
                                        >
                                            EXTRAIRE TRANSPORT
                                        </Button>
                                    </div>

                                    {/* COL 3: DETTES */}
                                    <div className="lg:col-span-3 p-6 border-r border-gray-50 bg-amber-50/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-amber-600 font-black uppercase text-[10px] italic">
                                                <AlertCircle size={16} /> Dettes
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-black">Restant: {emp.totalDebtRemaining}$</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-100 shadow-inner">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Déduire :</span>
                                            <Input 
                                                type="number" 
                                                disabled={emp.isPaid}
                                                className="h-6 border-none bg-transparent text-xs font-black text-amber-700 p-0 focus-visible:ring-0"
                                                value={debtDeductions[emp.id] || ''}
                                                onChange={(e) => setDebtDeductions({...debtDeductions, [emp.id]: parseFloat(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>

                                    {/* COL 4: TOTAL NET */}
                                    <div className="lg:col-span-3 p-6 bg-gray-900 text-white flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Total Net Final</h4>
                                            <div className="text-right">
                                                <p className="text-[9px] text-gray-500 uppercase">Primes</p>
                                                <p className="text-xs font-bold text-emerald-400">+{emp.totalBonuses} $</p>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-black text-white my-2">
                                            {emp.isPaid ? emp.payslipData.net_paid.toLocaleString() : totalNet.toLocaleString()} $
                                        </p>
                                        <div className="grid grid-cols-5 gap-2 mt-2">
                                            <Button 
                                                disabled={isSaving === emp.id || emp.isPaid}
                                                onClick={() => handleProcessPayment(emp)}
                                                className={`col-span-4 h-9 rounded-xl text-[9px] font-black uppercase transition-all ${
                                                    emp.isPaid ? 'bg-emerald-500' : 'bg-rose-600 hover:bg-rose-700'
                                                }`}
                                            >
                                                {isSaving === emp.id ? <Loader2 className="animate-spin" size={14}/> : emp.isPaid ? <BadgeCheck size={16}/> : 'Valider'}
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                disabled={!emp.isPaid} 
                                                onClick={() => generateFullPayslipPDF(emp, selectedMonth, selectedYear)}
                                                className="h-9 rounded-xl border-white/10 bg-white/5 p-0 text-white hover:bg-white/10"
                                            >
                                                <Printer size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}