// app/hr/shops/ShopForm.tsx
'use client'

import { useState, useEffect } from 'react' // Ajout de useEffect
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2, Building2 } from 'lucide-react'
import { getOdooCompanies } from '../actions'

export default function ShopForm({ shop, onClose, onSuccess }: any) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [fetchingOdoo, setFetchingOdoo] = useState(true)
    const [odooCompanies, setOdooCompanies] = useState<{id: number, name: string}[]>([])
    
    const [formData, setFormData] = useState({
        name: shop?.name || '',
        odoo_company_id: shop?.odoo_company_id?.toString() || ''
    })

    // Charger les compagnies Odoo au montage
    useEffect(() => {
        const loadCompanies = async () => {
            setFetchingOdoo(true)
            const data = await getOdooCompanies()
            setOdooCompanies(data)
            setFetchingOdoo(false)
        }
        loadCompanies()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            name: formData.name,
            odoo_company_id: formData.odoo_company_id ? parseInt(formData.odoo_company_id) : null
        }

        const { error } = shop 
            ? await supabase.from('shops').update(payload).eq('id', shop.id)
            : await supabase.from('shops').insert([payload])

        if (error) alert(error.message)
        else onSuccess()
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">{shop ? 'Modifier' : 'Créer'} la boutique</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors">
                        <X size={20}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* NOM DE LA BOUTIQUE */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Nom de la Boutique (PB)</label>
                        <input 
                            required 
                            placeholder="ex: PB.24"
                            className="w-full px-4 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-medium"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    {/* SELECTION COMPANY ODOO */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest flex items-center justify-between">
                            Liaison Compagnie Odoo
                            {fetchingOdoo && <Loader2 size={10} className="animate-spin" />}
                        </label>
                        <div className="relative">
                            <select 
                                className="w-full px-4 py-3 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-medium appearance-none disabled:opacity-50"
                                value={formData.odoo_company_id}
                                disabled={fetchingOdoo}
                                onChange={e => setFormData({...formData, odoo_company_id: e.target.value})}
                            >
                                <option value="">Aucune liaison (Optionnel)</option>
                                {odooCompanies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name} (ID: {company.id})
                                    </option>
                                ))}
                            </select>
                            <Building2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {odooCompanies.length === 0 && !fetchingOdoo && (
                            <p className="text-[9px] text-amber-600 font-bold uppercase mt-1 ml-1">Impossible de charger les compagnies d'Odoo</p>
                        )}
                    </div>

                    <button 
                        disabled={loading || fetchingOdoo}
                        className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {shop ? 'Mettre à jour' : 'Enregistrer la boutique'}
                    </button>
                </form>
            </div>
        </div>
    )
}