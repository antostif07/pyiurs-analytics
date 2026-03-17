import { getHSCodeDetails } from "./actions";
import SalesChart from "./SalesChart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, ArrowLeft, MapPin, Package, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ProductImage from "@/app/marketing/components/ProductImage";

export default async function HSCodeDetailPage({ params }: { params: Promise<{ hsCode: string }> }) {
    const {hsCode} = await params
    const data = await getHSCodeDetails(hsCode);
    const ai = data.tracker?.ai_prediction_data;
    const productName = data.tracker?.product_name_base || "Produit Beauty";

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* NAVIGATION & RETOUR */}
            <div className="flex items-center gap-4">
                <Link href="/gestion-beauty">
                    <Button variant="ghost" size="icon" className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all">
                        <ArrowLeft size={18} />
                    </Button>
                </Link>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">
                    Retour au Dashboard
                </span>
            </div>

            {/* SECTION HERO : IMAGE ET TITRE */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-8 bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 relative overflow-hidden">
                {/* CONTAINER IMAGE PRO */}
                <div className="w-48 h-48 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 shadow-inner group">
                    <ProductImage 
                        src={`https://images.pyiurs.com/images/${hsCode}_.jpg`} 
                        alt={productName} 
                    />
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                        <Badge className="bg-rose-600 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Segment Beauty
                        </Badge>
                        <Badge variant="outline" className="border-gray-200 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                            HS: {hsCode}
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">
                        {productName}
                    </h1>
                    <p className="text-gray-400 font-medium italic text-sm">
                        Analyse prédictive des stocks basée sur les flux PoS Odoo
                    </p>
                </div>

                {/* Filigrane décoratif en arrière-plan */}
                <Package size={200} className="absolute -right-10 -bottom-10 opacity-[0.02] -rotate-12 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SECTION GAUCHE : ANALYSE DES VENTES */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-8 border-none shadow-sm rounded-[40px] bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <History className="text-rose-500" size={18} />
                                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 italic">Evolution des sorties (60j)</h3>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Source : Odoo PoS</span>
                        </div>
                        <SalesChart data={data.chartData} />
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* STOCK PAR BOUTIQUE */}
                        <Card className="p-8 border-none shadow-sm rounded-xl bg-white">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-rose-500" /> Répartition Boutique
            </h3>
            {/* CALCUL ET AFFICHAGE DU TOTAL */}
            <Badge className="bg-gray-900 text-white border-none px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                Total: {data.locations.reduce((acc: number, loc: any) => acc + loc.qty, 0)} pcs
            </Badge>
        </div>

        <div className="space-y-3">
            {data.locations.length > 0 ? (
                <>
                    {/* LIGNE RÉCAPITULATIVE DU TOTAL (Style Mis en avant) */}
                    <div className="flex justify-between items-center p-4 bg-gray-900 rounded-2xl mb-4 border border-gray-800">
                        <span className="text-xs font-black text-rose-400 uppercase italic">Stock Global Disponible</span>
                        <span className="font-black text-white text-lg">
                            {data.locations.reduce((acc: number, loc: any) => acc + loc.qty, 0)}
                        </span>
                    </div>

                    {/* LISTE DES BOUTIQUES */}
                    <div className="space-y-2 max-h-50 overflow-y-auto pr-1">
                        {data.locations.map((loc: any) => (
                            <div key={loc.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-rose-50/30 transition-colors group">
                                <span className="text-xs font-bold text-gray-600 group-hover:text-rose-900">{loc.name}</span>
                                <span className="font-black text-gray-900 bg-white px-3 py-1 rounded-lg shadow-xs border border-gray-100">{loc.qty}</span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className="text-xs text-gray-400 italic text-center py-4">Aucun stock en rayon actuellement.</p>
            )}
        </div>
    </Card>

                        {/* RÉSUMÉ IA */}
                        <Card className="p-8 border-none shadow-sm rounded-xl bg-gray-900 text-white">
                            <div className="flex items-center gap-2 mb-6">
                                <BrainCircuit size={18} className="text-rose-400" />
                                <h3 className="font-black text-[10px] uppercase text-rose-400 tracking-widest">Diagnostic Intelligence Artificielle</h3>
                            </div>
                            <p className="text-xs italic leading-relaxed text-gray-300">
                                "{ai?.trend_analysis || "Analyse en attente de données complémentaires."}"
                            </p>
                        </Card>
                    </div>
                </div>

                {/* SECTION DROITE : PRÉDICTIONS DE RUPTURE */}
                <div className="space-y-6">
                    <Card className="p-8 border-none shadow-xl rounded-[40px] bg-rose-600 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-4xl font-black tracking-tighter mb-1">
                                {ai?.stockout_date ? format(new Date(ai.stockout_date), 'dd MMMM', { locale: fr }) : "Indisponible"}
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-200">Date de rupture estimée</p>
                            
                            <div className="mt-8 pt-8 border-t border-white/20 flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-rose-100 italic">Vitesse de vente</span>
                                {/* On affiche directement la string renvoyée par l'IA */}
                                <span className="font-black text-sm text-right leading-tight">
                                    {ai?.burn_rate || "Analyse en cours..."}
                                </span>
                            </div>
                        </div>
                        {/* Décoration en fond */}
                        <div className="absolute -right-6 -top-6 opacity-20">
                            <BrainCircuit size={120} />
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-[0.3em] ml-4">Plan de réapprovisionnement</h3>
                        {ai?.purchase_options?.map((opt: any) => (
                            <Card key={opt.label} className="p-6 border-none shadow-sm rounded-[28px] bg-white flex justify-between items-center group hover:shadow-md transition-all border border-transparent hover:border-rose-100">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-rose-500 mb-1 tracking-widest">{opt.label}</p>
                                    <p className="text-xl font-black text-gray-900">{opt.qty} <span className="text-[10px] text-gray-400">pcs.</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Autonomie</p>
                                    <Badge className="bg-gray-100 text-gray-900 border-none font-black text-xs px-2 py-1 rounded-lg">
                                        {opt.duration_days} jours
                                    </Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}