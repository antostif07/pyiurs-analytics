import { CalendarDays } from "lucide-react";
import { GlobalConfigProps } from "../types";

export function GlobalConfig({
    polog,
    setPolog,
    dateChargement,
    setDateChargement,
    departement,
    setDepartement,
    logPurchaseOrders
}: GlobalConfigProps) {
    return (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                <CalendarDays className="text-indigo-600 w-4 h-4" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Paramètres Globaux d'Importation
                </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">POLOG (PO contenant LOG)</label>
                    <select
                        value={polog}
                        onChange={(e) => setPolog(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold outline-none h-10 cursor-pointer"
                    >
                        <option value="">Sélectionner un PO LOG...</option>
                        {logPurchaseOrders.map((po) => (
                            // @ts-ignore
                            <option key={po.id} value={po.name}>{po.name} ({po.partner_id[1]})</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Date de Chargement</label>
                    <input type="date" value={dateChargement} onChange={(e) => setDateChargement(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium outline-none h-10" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Département (Segment)</label>
                    <select value={departement} onChange={(e) => setDepartement(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold outline-none h-10">
                        <option value="Beauty">Beauty</option>
                        <option value="Femme">Femme</option>
                        <option value="Enfant">Enfant</option>
                    </select>
                </div>
            </div>
        </div>
    );
}