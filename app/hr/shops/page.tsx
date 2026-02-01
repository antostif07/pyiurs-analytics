// app/hr/shops/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Store, Building2, Edit2, Loader2, Landmark } from 'lucide-react'
import { Card } from "@/components/ui/card"
import ShopForm from './ShopForm'

export default function ShopsPage() {
    const supabase = createClient()
    const [shops, setShops] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingShop, setEditingShop] = useState<any>(null)

    const fetchShops = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('shops')
            .select('*')
            .order('name', { ascending: true })
        if (data) setShops(data)
        setLoading(false)
    }

    useEffect(() => { fetchShops() }, [])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Boutiques</h1>
                    <p className="text-sm text-gray-500">Configurez vos points de vente et liaisons Odoo</p>
                </div>
                <button 
                    onClick={() => { setEditingShop(null); setIsFormOpen(true); }}
                    className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-all"
                >
                    <Plus size={18} />
                    Nouvelle Boutique
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center">
                        <Loader2 className="animate-spin text-rose-600" />
                        <p className="text-xs text-gray-400 mt-4 uppercase font-black">Chargement des boutiques...</p>
                    </div>
                ) : shops.length > 0 ? (
                    shops.map((shop) => (
                        <Card key={shop.id} className="p-6 border-none shadow-sm rounded-3xl bg-white group relative overflow-hidden">
                            <div className="flex items-start justify-between relative z-10">
                                <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                                    <Store size={24} />
                                </div>
                                <button 
                                    onClick={() => { setEditingShop(shop); setIsFormOpen(true); }}
                                    className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>

                            <div className="mt-4 relative z-10">
                                <h3 className="text-lg font-bold text-gray-900">{shop.name}</h3>
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium">
                                    <Building2 size={14} className="text-gray-400" />
                                    {shop.odoo_company_id ? (
                                        <span className="text-blue-600">Odoo Company ID: {shop.odoo_company_id}</span>
                                    ) : (
                                        <span className="italic text-gray-300">Non liée à Odoo</span>
                                    )}
                                </div>
                            </div>

                            {/* Décoration en arrière-plan */}
                            <Landmark className="absolute -right-4 -bottom-4 text-gray-50 w-24 h-24 -z-0 transition-transform group-hover:scale-110" />
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
                        <Store className="text-gray-200 mb-4" size={48} />
                        <p className="text-gray-500 font-bold">Aucune boutique enregistrée</p>
                        <p className="text-xs text-gray-400 mt-1">Commencez par créer vos boutiques avant les employés.</p>
                    </div>
                )}
            </div>

            {isFormOpen && (
                <ShopForm 
                    shop={editingShop} 
                    onClose={() => setIsFormOpen(false)} 
                    onSuccess={() => { setIsFormOpen(false); fetchShops(); }} 
                />
            )}
        </div>
    )
}