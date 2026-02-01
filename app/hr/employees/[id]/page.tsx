import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Edit2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Link2, Calendar, 
  CheckCircle2, XCircle, ShoppingBag,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
    const supabase = await createClient()

    // On récupère l'employé avec le nom de sa boutique
    const { data: employee } = await supabase
        .from('employees')
        .select('*, shops(name)')
        .eq('id', params.id)
        .single()

    if (!employee) notFound()

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* HEADER NAVIGATION */}
            <div className="flex items-center justify-between">
                <Link href="/hr/employees">
                    <Button variant="ghost" className="gap-2 text-gray-500 hover:text-gray-900">
                        <ArrowLeft size={16} /> Retour à la liste
                    </Button>
                </Link>
                <Link href={`/hr/employees/${employee.id}/edit`}>
                    <Button className="bg-rose-600 hover:bg-rose-700 rounded-xl gap-2 shadow-lg shadow-rose-100">
                        <Edit2 size={16} /> Modifier le profil
                    </Button>
                </Link>
            </div>

            {/* HEADER PROFIL */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="w-32 h-32 bg-rose-100 text-rose-600 rounded-[40px] flex items-center justify-center text-4xl font-black shadow-inner z-10">
                    {employee.name.substring(0, 2).toUpperCase()}
                </div>
                
                <div className="flex-1 text-center md:text-left z-10">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                        <h1 className="text-3xl font-black text-gray-900">{employee.name}</h1>
                        <Badge variant={employee.is_active ? "default" : "destructive"} className="w-fit mx-auto md:mx-0 uppercase text-[10px] tracking-widest px-3 py-1 rounded-full">
                            {employee.is_active ? "Actif" : "Inactif"}
                        </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-gray-500 font-medium">
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <Briefcase size={16} className="text-rose-500" /> {employee.shops?.name || "Non affecté"}
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <Mail size={16} className="text-rose-500" /> {employee.email || "Pas d'email"}
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2 font-mono text-sm">
                            <Badge className="bg-gray-900">ID: {employee.matricule}</Badge>
                        </div>
                    </div>
                </div>

                {/* Decoration */}
                <div className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12">
                   <User size={240} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLONNE GAUCHE : INFOS PERSONNELLES */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-8 border-none shadow-sm rounded-[32px] bg-white">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-8 border-b pb-4">Coordonnées & Localisation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Téléphone Service</p>
                                <p className="text-lg font-bold text-gray-800">{employee.service_phone || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Téléphone Privé</p>
                                <p className="text-lg font-bold text-gray-800">{employee.private_phone || "—"}</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Adresse Domicile</p>
                                <div className="flex items-start gap-2 text-gray-800 font-medium">
                                    <MapPin size={18} className="text-rose-500 mt-1 flex-shrink-0" />
                                    <span>{employee.address || "Aucune adresse enregistrée"}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-sm rounded-[32px] bg-white">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-8 border-b pb-4">Produits suivis pour commissions</h3>
                        <div className="flex flex-wrap gap-2">
                            {employee.commission_product_ids?.length > 0 ? (
                                employee.commission_product_ids.map((prodId: number) => (
                                    <Badge key={prodId} variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 px-4 py-2 rounded-xl flex gap-2 items-center">
                                        <ShoppingBag size={12} /> ID Produit Odoo: {prodId}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 italic">Aucun produit configuré pour cet employé.</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* COLONNE DROITE : FINANCES & ODOO */}
                <div className="space-y-8">
                    <Card className="p-8 border-none shadow-sm rounded-[32px] bg-gray-900 text-white">
                        <h3 className="text-[10px] font-black uppercase text-rose-400 tracking-[0.2em] mb-8">Rémunération Brute</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-gray-400 text-sm">Salaire Base</span>
                                <span className="text-2xl font-black">{employee.base_salary.toLocaleString()} $</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-gray-400 text-sm">Transport</span>
                                <span className="text-2xl font-black">{employee.transport_allowance.toLocaleString()} $</span>
                            </div>
                            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                <span className="text-rose-400 font-bold uppercase text-xs">Total Mensuel</span>
                                <span className="text-3xl font-black text-rose-500">
                                    {(employee.base_salary + employee.transport_allowance).toLocaleString()} $
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-sm rounded-[32px] bg-white border border-gray-100">
                        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Synchronisation ERP</h3>
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                                <Link2 size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase">Odoo Employee ID</p>
                                <p className="text-xl font-black text-blue-900">{employee.employee_odoo_id || "Non lié"}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 leading-relaxed italic">
                            Ce lien permet de récupérer les ventes et commissions directement depuis Odoo lors du calcul de la paie.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}