'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  AlertCircle, Save, Loader2, Calendar, 
  ArrowRightLeft, Printer, TrendingUp, DollarSign,
  Wallet,
  FileDown,
  MapPin
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format, endOfMonth, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateTransportPDF } from './exportTransportPDF'
import { generateGlobalTransportPDF } from './exportGlobalTransportPDF'
import Link from 'next/link'
import { MONTHS } from '../utils'

export default function PayrollPage() {
    const supabase = createClient()
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => (currentYear - i).toString())
    const PAYROLL_BASIS = 26;

    const [loading, setLoading] = useState(true)
    const [shops, setShops] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])

    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'))
    const [selectedYear, setSelectedYear] = useState(currentYear.toString())
    const [selectedShopId, setSelectedShopId] = useState<string>('all')
    const [debtDeductions, setDebtDeductions] = useState<Record<string, number>>({})
    const [hasAttendance, setHasAttendance] = useState(true);

    // Calcul précis du nombre de jours dans le mois sélectionné
    const daysInMonth = endOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1)).getDate()

    useEffect(() => {
        fetchInitialData()
    }, [])
    
    const fetchInitialData = async () => {
        const { data } = await supabase.from('shops').select('*').order('name')
        if (data) setShops(data)
    }

    useEffect(() => {
        fetchPayrollData()
    }, [selectedMonth, selectedYear, selectedShopId])

    const fetchPayrollData = async () => {
        setLoading(true)
        const startDate = `${selectedYear}-${selectedMonth}-01`
        const endDate = format(endOfMonth(new Date(`${selectedYear}-${selectedMonth}-01`)), 'yyyy-MM-dd')

        // 1. On récupère les données de base sans filtres croisés complexes pour éviter les INNER JOIN cachés
        let query = supabase
            .from('employees')
            .select(`
                *,
                shops(name),
                attendances(*),
                employee_bonuses(*),
                employee_debts(*)
            `)
            .eq('is_active', true)
            .order('name')
        
        if (selectedShopId !== 'all') {
            query = query.eq('shop_id', selectedShopId)
        }

        const { data: emps } = await query

        if (emps) {
            let totalLogsFound = 0;
            const processed = emps.map(emp => {
                const filteredAttendances = emp.attendances?.filter((a: any) => a.date >= startDate && a.date <= endDate) || [];
                totalLogsFound += filteredAttendances.length;
                const filteredBonuses = emp.employee_bonuses?.filter((b: any) => b.month === parseInt(selectedMonth) && b.year === parseInt(selectedYear)) || []

                // --- LOGIQUE 26 JOURS HORS DIMANCHES ---
                const penaltyDays = filteredAttendances.filter((a: any) => {
                    const isSunday = getDay(new Date(a.date)) === 0;
                    const status = a.validated_status || a.status;
                    return !isSunday && ['absent', 'sick', 'congé circonstaciel', 'congé non circonstanciel', 'suspension'].includes(status);
                }).length;

                const transportEligibleDays = Math.max(0, PAYROLL_BASIS - penaltyDays)
                const netTransport = (emp.transport_allowance / PAYROLL_BASIS) * transportEligibleDays
                const deductionAbsence = (emp.base_salary / PAYROLL_BASIS) * penaltyDays
                const totalBonuses = filteredBonuses.reduce((acc: number, b: any) => acc + b.amount, 0)
                const totalDebtRemaining = emp.employee_debts?.filter((d:any) => d.status === 'active').reduce((acc: number, d: any) => acc + d.remaining_amount, 0) || 0

                return {
                    ...emp,
                    penaltyDays,
                    transportEligibleDays,
                    netTransport,
                    deductionAbsence,
                    totalBonuses,
                    totalDebtRemaining,
                    filteredAttendances // utile pour l'export individuel
                }
            })
            setEmployees(processed)
            setHasAttendance(totalLogsFound > 0)
        }
        setLoading(false)
    }

    const handlePrintTransport = async (emp: any) => {
        // On recalcule les valeurs pour être sûr
        const nonEligibleDays = emp.attendances.filter((a: any) => {
            const isSunday = getDay(new Date(a.date)) === 0;
            const status = a.validated_status || a.status;
            return !isSunday && ['absent', 'sick', 'congé circonstaciel', 'congé non circonstanciel', 'suspension'].includes(status);
        }).length;
        const calculatedEligibleDays = Math.max(0, PAYROLL_BASIS - nonEligibleDays);
        const netTransport = (emp.transport_allowance / PAYROLL_BASIS) * calculatedEligibleDays;
        
        await generateTransportPDF(
            emp, 
            selectedMonth, 
            selectedYear, 
            calculatedEligibleDays, 
            PAYROLL_BASIS, // On envoie 26 au lieu de daysInMonth
            netTransport
        );
    };

    const handleGlobalExport = async () => {
        const shopName = selectedShopId === 'all' ? 'Tous les sites' : shops.find(s => s.id === selectedShopId)?.name
        await generateGlobalTransportPDF(employees, selectedMonth, selectedYear, shopName)
    }

    return (
        <div className="space-y-6 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="bg-rose-50 p-3 rounded-2xl text-rose-600">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-tight">Clôture Paie</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Base 26 jours</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {/* Filtre Boutique */}
                    <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                        <SelectTrigger className="w-44 h-10 rounded-xl bg-gray-50 border-none font-bold text-xs">
                            <MapPin size={14} className="mr-2 text-gray-400"/>
                            <SelectValue placeholder="Boutique" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les sites</SelectItem>
                            {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Filtre Mois/Année */}
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 items-center h-10">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-28 border-none bg-transparent font-bold text-xs shadow-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>
                                        {format(new Date(2025, i, 1), 'MMMM', { locale: fr })}
                                    </SelectItem>
                                ))}
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
                        onClick={handleGlobalExport}
                        disabled={employees.length === 0}
                        className="bg-gray-900 hover:bg-black text-white rounded-xl font-bold h-10 px-4 gap-2"
                    >
                        <FileDown size={18} />
                        Rapport Transport
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-rose-500 mb-4" size={32} />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Calcul des enveloppes...</p>
                </div>
            ): !hasAttendance ? (
                /* ÉTAT VIDE : AUCUN POINTAGE TROUVÉ */
                <Card className="p-20 border-none shadow-sm rounded-[40px] bg-white flex flex-col items-center justify-center text-center">
                    <div className="bg-amber-50 p-6 rounded-full mb-6">
                        <Calendar className="text-amber-500" size={48} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Aucun pointage détecté</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-2 leading-relaxed">
                        Il n'y a aucun enregistrement de présence pour <span className="font-bold text-rose-600">{MONTHS.find(m => m.val === selectedMonth)?.label} {selectedYear}</span>.
                    </p>
                    <div className="mt-8 flex gap-3">
                        <Link href="/hr/attendance/import">
                            <Button className="bg-gray-900 hover:bg-black text-white rounded-2xl px-8 h-12 font-bold">
                                Importer le fichier machine
                            </Button>
                        </Link>
                    </div>
                </Card>
            ) : employees.length === 0 ? (
                /* ÉTAT VIDE : AUCUN EMPLOYÉ DANS CETTE BOUTIQUE */
                <Card className="p-20 text-center border-none shadow-sm rounded-[32px] bg-white text-gray-400 italic">
                    Aucun employé actif trouvé pour ce site.
                </Card>
            ) : (
                <div className="space-y-4">
                    {employees.map((emp) => {
                        return (
                            <Card key={emp.id} className="p-0 border-none shadow-sm rounded-[32px] bg-white overflow-hidden group border border-gray-100 transition-all hover:shadow-md">
                                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                                    
                                    {/* EMPLOYE */}
                                    <div className="lg:col-span-3 p-6 border-r border-gray-50 bg-gray-50/30">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">
                                                {emp.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm leading-tight">{emp.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.shops?.name || 'Sans Boutique'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                                <span className="text-gray-400">Salaire Base</span>
                                                <span className="text-gray-900">{emp.base_salary}$</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                                <span className="text-red-400">Pénalité ({emp.penaltyDays}j)</span>
                                                <span className="text-red-600">-{emp.deductionAbsence.toFixed(2)}$</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TRANSPORT */}
                                    <div className="lg:col-span-3 p-6 border-r border-gray-50">
                                        <div className="flex items-center gap-2 text-blue-600 mb-4">
                                            <ArrowRightLeft size={16} />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Enveloppe Transport</h4>
                                        </div>
                                        <p className="text-2xl font-black text-blue-700">{emp.netTransport.toFixed(2)}$</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                            {PAYROLL_BASIS - emp.penaltyDays} jours payés / {PAYROLL_BASIS}
                                        </p>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => handlePrintTransport(emp)}
                                            className="mt-4 w-full h-8 rounded-xl text-[9px] font-black border-blue-100 text-blue-600 hover:bg-blue-50"
                                        >
                                            EXTRAIRE TRANSPORT
                                        </Button>
                                    </div>

                                    {/* DETTES */}
                                    <div className="lg:col-span-3 p-6 border-r border-gray-50 bg-amber-50/20">
                                        <div className="flex items-center justify-between mb-4 text-amber-600">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={16} />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Dettes</h4>
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-700 text-[9px] border-none">Total: {emp.totalDebtRemaining}$</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-100">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Déduire :</span>
                                            <Input 
                                                type="number" 
                                                className="h-7 border-none bg-transparent text-xs font-black text-amber-700 focus-visible:ring-0 p-0"
                                                value={debtDeductions[emp.id] || ''}
                                                onChange={(e) => setDebtDeductions({...debtDeductions, [emp.id]: parseFloat(e.target.value) || 0})}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-[9px] text-amber-500 italic mt-2 leading-tight">Le montant sera retiré du Net Final.</p>
                                    </div>

                                    {/* NET FINAL */}
                                    <div className="lg:col-span-3 p-6 bg-gray-900 text-white flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Salaire Net</h4>
                                            <div className="text-right">
                                                <p className="text-[9px] text-gray-500 uppercase">Primes</p>
                                                <p className="text-xs font-bold text-emerald-400">+{emp.totalBonuses}$</p>
                                            </div>
                                        </div>
                                        <p className="text-3xl font-black text-white my-2">
                                            {(emp.base_salary - emp.deductionAbsence + emp.netTransport + emp.totalBonuses - (debtDeductions[emp.id] || 0)).toLocaleString()}$
                                        </p>
                                        <div className="grid grid-cols-5 gap-2 mt-2">
                                            <Button className="col-span-4 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-[9px] font-black uppercase tracking-widest">
                                                Valider Paiement
                                            </Button>
                                            <Button variant="outline" className="h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 p-0 text-white">
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