'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, TrendingUp, TrendingDown, 
  Calendar, Trash2,
  Loader2, History,
  Badge
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function BonusesDebtsPage() {
    const supabase = createClient()
    
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<any[]>([])
    const [bonuses, setBonuses] = useState<any[]>([])
    const [activeDebts, setActiveDebts] = useState<any[]>([])
    
    // Filtres de période
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'))
    const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'))

    useEffect(() => {
        fetchInitialData()
    }, [selectedMonth, selectedYear])

    const fetchInitialData = async () => {
        setLoading(true)
        // 1. Charger les employés
        const { data: emps } = await supabase.from('employees').select('id, name, matricule').eq('is_active', true).order('name')
        setEmployees(emps || [])

        // 2. Charger les primes du mois
        const { data: bns } = await supabase
            .from('employee_bonuses')
            .select('*, employees(name)')
            .eq('month', parseInt(selectedMonth))
            .eq('year', parseInt(selectedYear))
        setBonuses(bns || [])

        // 3. Charger toutes les dettes actives (peu importe le mois)
        const { data: dbt } = await supabase
            .from('employee_debts')
            .select('*, employees(name)')
            .eq('status', 'active')
        setActiveDebts(dbt || [])
        
        setLoading(false)
    }

    return (
        <div className="space-y-6 pb-20">
            {/* HEADER ET SÉLECTEUR DE PÉRIODE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Primes & Dettes</h1>
                    <p className="text-sm text-gray-500 font-medium">Préparation des variables de paie</p>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    <Calendar size={16} className="ml-2 text-gray-400" />
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-32 border-none bg-transparent font-bold text-xs">
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
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-24 border-none bg-transparent font-bold text-rose-600 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="bonuses" className="w-full">
                <TabsList className="bg-white border border-gray-100 p-1 h-14 rounded-2xl gap-2 shadow-sm mb-6">
                    <TabsTrigger value="bonuses" className="rounded-xl px-8 h-full data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold">
                        <TrendingUp size={18} className="mr-2" />
                        Primes & Gratifications
                    </TabsTrigger>
                    <TabsTrigger value="debts" className="rounded-xl px-8 h-full data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 font-bold">
                        <TrendingDown size={18} className="mr-2" />
                        Dettes & Avances
                    </TabsTrigger>
                </TabsList>

                {/* --- TABS: PRIMES --- */}
                <TabsContent value="bonuses" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* FORMULAIRE PRIME */}
                        <BonusForm 
                            employees={employees} 
                            month={selectedMonth} 
                            year={selectedYear} 
                            onSuccess={fetchInitialData} 
                        />
                        
                        {/* LISTE DES PRIMES DU MOIS */}
                        <Card className="lg:col-span-2 border-none shadow-sm rounded-[32px] bg-white overflow-hidden h-fit">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Primes de {format(new Date(2025, parseInt(selectedMonth)-1, 1), 'MMMM', { locale: fr })}</h3>
                                <Badge className="bg-emerald-500">{bonuses.length} entrées</Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Employé</th>
                                            <th className="px-6 py-4">Motif</th>
                                            <th className="px-6 py-4 text-right">Montant</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {bonuses.length > 0 ? bonuses.map(b => (
                                            <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900 text-sm">{b.employees?.name}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500">{b.reason}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600">{b.amount} $</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" onClick={async () => {
                                                        await supabase.from('employee_bonuses').delete().eq('id', b.id);
                                                        fetchInitialData();
                                                    }} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></Button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic text-xs">Aucune prime saisie pour ce mois.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- TABS: DETTES --- */}
                <TabsContent value="debts" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* FORMULAIRE DETTE */}
                        <DebtForm employees={employees} onSuccess={fetchInitialData} />
                        
                        {/* LISTE DES DETTES ACTIVES */}
                        <Card className="lg:col-span-2 border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Dettes & Avances en cours</h3>
                                <Badge className="bg-amber-500">{activeDebts.length} dossiers</Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Employé</th>
                                            <th className="px-6 py-4">Motif</th>
                                            <th className="px-6 py-4 text-right">Initial</th>
                                            <th className="px-6 py-4 text-right">Restant</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {activeDebts.map(d => (
                                            <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900 text-sm">{d.employees?.name}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500">{d.reason}</td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-400">{d.initial_amount} $</td>
                                                <td className="px-6 py-4 text-right font-black text-amber-600">{d.remaining_amount} $</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="text-gray-300 hover:text-rose-500"><History size={16}/></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

// --- SOUS-COMPOSANT: FORMULAIRE PRIME ---
function BonusForm({ employees, month, year, onSuccess }: any) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({ empId: '', amount: '', reason: '' })

    const onSubmit = async (e: any) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.from('employee_bonuses').insert({
            employee_id: formData.empId,
            month: parseInt(month),
            year: parseInt(year),
            amount: parseFloat(formData.amount),
            reason: formData.reason
        })
        if (!error) {
            setFormData({ empId: '', amount: '', reason: '' })
            onSuccess()
        }
        setLoading(false)
    }

    return (
        <Card className="p-8 border-none shadow-sm rounded-[32px] bg-white h-fit">
            <h3 className="font-black text-lg mb-6 flex items-center gap-2">
                <Plus className="text-emerald-500" /> Ajouter une prime
            </h3>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Employé</Label>
                    <Select value={formData.empId} onValueChange={(v) => setFormData({...formData, empId: v})}>
                        <SelectTrigger className="rounded-xl bg-gray-50 h-12 border-none">
                            <SelectValue placeholder="Choisir l'employé" />
                        </SelectTrigger>
                        <SelectContent>{employees.map((e:any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Motif</Label>
                    <Input required placeholder="ex: Gratification annuelle" className="rounded-xl bg-gray-50 h-12 border-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Montant ($)</Label>
                    <Input required type="number" placeholder="0.00" className="rounded-xl bg-gray-50 h-12 border-none font-bold" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <Button disabled={loading} className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-100">
                    {loading ? <Loader2 className="animate-spin" /> : "Enregistrer la prime"}
                </Button>
            </form>
        </Card>
    )
}

// --- SOUS-COMPOSANT: FORMULAIRE DETTE ---
function DebtForm({ employees, onSuccess }: any) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({ empId: '', amount: '', reason: '' })

    const onSubmit = async (e: any) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.from('employee_debts').insert({
            employee_id: formData.empId,
            initial_amount: parseFloat(formData.amount),
            remaining_amount: parseFloat(formData.amount),
            reason: formData.reason,
            status: 'active'
        })
        if (!error) {
            setFormData({ empId: '', amount: '', reason: '' })
            onSuccess()
        }
        setLoading(false)
    }

    return (
        <Card className="p-8 border-none shadow-sm rounded-[32px] bg-white h-fit">
            <h3 className="font-black text-lg mb-6 flex items-center gap-2 text-amber-700">
                <Plus className="text-amber-500" /> Créer une dette
            </h3>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Employé concerné</Label>
                    <Select value={formData.empId} onValueChange={(v) => setFormData({...formData, empId: v})}>
                        <SelectTrigger className="rounded-xl bg-gray-50 h-12 border-none">
                            <SelectValue placeholder="Choisir l'employé" />
                        </SelectTrigger>
                        <SelectContent>{employees.map((e:any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Motif du retrait</Label>
                    <Input required placeholder="ex: Avance sur salaire / Perte matériel" className="rounded-xl bg-gray-50 h-12 border-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Montant total ($)</Label>
                    <Input required type="number" placeholder="0.00" className="rounded-xl bg-gray-50 h-12 border-none font-bold" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <Button disabled={loading} className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold shadow-lg shadow-amber-100">
                    {loading ? <Loader2 className="animate-spin" /> : "Valider le retrait"}
                </Button>
            </form>
        </Card>
    )
}