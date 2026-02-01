'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Link2, DollarSign, User, Phone, MapPin, Briefcase, ArrowLeft, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// SHADCN UI
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import MultipleSelector, { Option } from "@/components/ui/multiselect"
import { Card } from '@/components/ui/card'

// Actions
import { getOdooHRData } from '../actions'

export default function EmployeeForm({ initialData }: { initialData?: any }) {
    const supabase = createClient()
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [fetchingData, setFetchingData] = useState(true)
    
    const [shops, setShops] = useState<any[]>([])
    const [odooEmployees, setOdooEmployees] = useState<Option[]>([])
    const [odooProducts, setOdooProducts] = useState<Option[]>([])
    const [selectedCommissions, setSelectedCommissions] = useState<Option[]>([])

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        matricule: initialData?.matricule || '',
        email: initialData?.email || '',
        shop_id: initialData?.shop_id || '',
        base_salary: initialData?.base_salary || 0,
        transport_allowance: initialData?.transport_allowance || 0,
        address: initialData?.address || '',
        service_phone: initialData?.service_phone || '',
        private_phone: initialData?.private_phone || '',
        employee_odoo_id: initialData?.employee_odoo_id?.toString() || '',
        is_active: initialData?.is_active ?? true
    })

    useEffect(() => {
        const initData = async () => {
            setFetchingData(true)
            try {
                const { data: shopsData } = await supabase.from('shops').select('id, name').order('name')
                const odoo = await getOdooHRData()

                setShops(shopsData || [])
                setOdooEmployees(odoo.employees)
                setOdooProducts(odoo.products)
                
                if (initialData?.commission_product_ids) {
                    const initialOptions = odoo.products.filter(p => 
                        initialData.commission_product_ids.includes(parseInt(p.value))
                    )
                    setSelectedCommissions(initialOptions)
                }
            } finally {
                setFetchingData(false)
            }
        }
        initData()
    }, [initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const commissionIds = selectedCommissions.map(opt => parseInt(opt.value))
        const payload = {
            ...formData,
            employee_odoo_id: formData.employee_odoo_id ? parseInt(formData.employee_odoo_id) : null,
            commission_product_ids: commissionIds,
            shop_id: formData.shop_id || null
        }

        const { error } = initialData 
            ? await supabase.from('employees').update(payload).eq('id', initialData.id)
            : await supabase.from('employees').insert([payload])

        if (error) {
            alert(error.message)
        } else {
            router.push('/hr/employees')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="gap-2 text-gray-500 hover:text-gray-900">
                    <ArrowLeft size={16} /> Retour
                </Button>
                <Button disabled={loading || fetchingData} className="bg-rose-600 hover:bg-rose-700 rounded-xl px-8 shadow-lg shadow-rose-100">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                    Enregistrer le profil
                </Button>
            </div>

            <Card className="p-8 md:p-10 space-y-12 border-none shadow-sm rounded-[32px] bg-white">
                {/* SECTION 1 : IDENTITÉ & AFFECTATION */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-[0.2em] flex items-center gap-2 border-b border-rose-100 pb-2">
                        <Briefcase size={14}/> Identité & Affectation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Matricule Interne</Label>
                            <Input required value={formData.matricule} onChange={e => setFormData({...formData, matricule: e.target.value})} placeholder="ex: RH-001" className="rounded-xl bg-gray-50/50 h-12 border-transparent focus:bg-white transition-all" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Nom Complet</Label>
                            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl bg-gray-50/50 h-12 border-transparent focus:bg-white transition-all" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Email Professionnel</Label>
                            <div className="relative">
                                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@entreprise.com" className="rounded-xl bg-gray-50/50 h-12 pl-10 border-transparent focus:bg-white transition-all" />
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Boutique / Site</Label>
                            <Select value={formData.shop_id} onValueChange={(val) => setFormData({...formData, shop_id: val})}>
                                <SelectTrigger className="rounded-xl bg-gray-50/50 h-12 border-transparent">
                                    <SelectValue placeholder="Affecter à une boutique" />
                                </SelectTrigger>
                                <SelectContent>{shops.map(shop => <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Correspondance Profil Odoo (HR)</Label>
                            <Select value={formData.employee_odoo_id} onValueChange={(val) => setFormData({...formData, employee_odoo_id: val})}>
                                <SelectTrigger className="rounded-xl bg-gray-50/50 h-12 border-transparent">
                                    <div className="flex items-center gap-2">
                                        <Link2 size={14} className="text-blue-500" />
                                        <SelectValue placeholder={fetchingData ? "Chargement..." : "Lier au profil Odoo"} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>{odooEmployees.map(emp => <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* SECTION 2 : FINANCES & COMMISSIONS */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-[0.2em] flex items-center gap-2 border-b border-rose-100 pb-2">
                        <DollarSign size={14}/> Rémunération & Commissions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Salaire de Base ($)</Label>
                            <Input type="number" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: parseFloat(e.target.value)})} className="rounded-xl bg-gray-50/50 h-12 border-transparent" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Indemnité Transport ($)</Label>
                            <Input type="number" value={formData.transport_allowance} onChange={e => setFormData({...formData, transport_allowance: parseFloat(e.target.value)})} className="rounded-xl bg-gray-50/50 h-12 border-transparent" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-xs font-bold text-gray-500 italic ml-1 text-gray-400">Produits suivis pour les commissions de vente (Odoo)</Label>
                            <MultipleSelector
                                value={selectedCommissions}
                                onChange={setSelectedCommissions}
                                defaultOptions={odooProducts}
                                placeholder="Rechercher des produits..."
                                emptyIndicator={<p className="text-center text-sm">Aucun produit trouvé</p>}
                                className="bg-gray-50/50 rounded-xl border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 3 : CONTACTS */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-[0.2em] flex items-center gap-2 border-b border-rose-100 pb-2">
                        <Phone size={14}/> Contact & Localisation
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Tél. Service</Label>
                            <Input placeholder="+243..." value={formData.service_phone} onChange={e => setFormData({...formData, service_phone: e.target.value})} className="rounded-xl bg-gray-50/50 h-12 border-transparent" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Tél. Privé</Label>
                            <Input placeholder="+243..." value={formData.private_phone} onChange={e => setFormData({...formData, private_phone: e.target.value})} className="rounded-xl bg-gray-50/50 h-12 border-transparent" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-xs font-bold text-gray-500 ml-1">Adresse Domicile</Label>
                            <div className="relative">
                                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="rounded-xl bg-gray-50/50 h-12 pl-10 border-transparent" />
                                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </form>
    )
}