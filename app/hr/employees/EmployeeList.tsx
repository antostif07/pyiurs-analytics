'use client'

import { useState, useEffect } from 'react'
import { 
  Search, UserPlus, Edit2, 
  CheckCircle2, XCircle, CreditCard, Link2,
  Users, SearchX, Eye 
} from 'lucide-react'
import { Card } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link' // Import indispensable pour la navigation

export default function EmployeeList() {
    const supabase = createClient();

    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchEmployees = async () => {
        setLoading(true)
        const { data } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true })
        
        if (data) setEmployees(data)
        setLoading(false)
    }

    useEffect(() => { fetchEmployees() }, [])

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.matricule?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Rechercher par nom ou matricule..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                {/* CHANGEMENT : Bouton devient un Link vers la page /new */}
                <Link href="/hr/employees/new">
                    <button className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-sm w-full sm:w-auto">
                        <UserPlus size={18} />
                        Ajouter un employé
                    </button>
                </Link>
            </div>

        {/* TABLEAU OU ÉTAT VIDE */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden min-h-[400px] flex flex-col bg-white">
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-gray-400 mt-4 font-bold uppercase tracking-widest">Chargement de l'effectif...</p>
                </div>
            ) : filteredEmployees.length > 0 ? (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employé</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Lien Odoo</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Salaire Base</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transport</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Statut</th>
                            <th className="px-6 py-4 w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group text-sm">
                                <td className="px-6 py-4">
                                    <Link href={`/hr/employees/${emp.id}`} className="flex flex-col hover:opacity-70 transition-opacity">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded uppercase">
                                                {emp.matricule || 'SANS-ID'}
                                            </span>
                                            <span className="font-bold text-gray-900">{emp.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{emp.email || 'Pas d\'email'}</span>
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-center gap-1">
                                        {emp.employee_odoo_id ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">
                                                <Link2 size={10} /> ID: {emp.employee_odoo_id}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-gray-300 italic">Non lié</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 font-bold text-gray-700">
                                        <CreditCard size={14} className="text-gray-400" />
                                        {emp.base_salary?.toLocaleString()} $
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 font-bold text-gray-700">
                                        <CreditCard size={14} className="text-gray-400" />
                                        {emp.transport_allowance?.toLocaleString()} $
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {emp.is_active ? (
                                        <CheckCircle2 size={18} className="text-emerald-500 mx-auto" />
                                    ) : (
                                        <XCircle size={18} className="text-gray-300 mx-auto" />
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {/* Lien vers Détail */}
                                        <Link href={`/hr/employees/${emp.id}`}>
                                            <button className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-rose-600 transition-colors shadow-sm border border-transparent hover:border-gray-100">
                                                <Eye size={16} />
                                            </button>
                                        </Link>
                                        {/* Lien vers Edition */}
                                        <Link href={`/hr/employees/${emp.id}/edit`}>
                                            <button className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 transition-colors shadow-sm border border-transparent hover:border-gray-100">
                                                <Edit2 size={16} />
                                            </button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="bg-gray-50 p-6 rounded-full mb-4">
                        {search ? <SearchX className="text-gray-300" size={48} /> : <Users className="text-gray-300" size={48} />}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                        {search ? "Aucun résultat" : "Effectif vide"}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-2">
                        {search ? `Pas d'employé pour "${search}"` : "Commencez par ajouter vos collaborateurs."}
                    </p>
                    {!search && (
                        <Link href="/hr/employees/new" className="mt-6">
                            <button className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">
                                <UserPlus size={18} />
                                Ajouter mon premier employé
                            </button>
                        </Link>
                    )}
                </div>
            )}
        </Card>
        </div>
    )
}