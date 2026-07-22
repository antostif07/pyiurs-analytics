import { FileSpreadsheet, Hash, User } from "lucide-react";
import { OdooMetaPanelProps } from "../types";

export function OdooMetaPanel({ selectedPo }: OdooMetaPanelProps) {
    return (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
                Données de Contrôle Odoo (Résolues)
            </h3>
            {selectedPo ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><Hash size={14} /></div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">ID Externe</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPo.externalId}</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><User size={14} /></div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Fournisseur</span>
                            <span className="font-black text-slate-900 dark:text-slate-100">{selectedPo.supplierName}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">ID Odoo : {selectedPo.supplierId}</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><FileSpreadsheet size={14} /></div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Référence Fournisseur</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPo.supplierRef || "N/D"}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-8 text-center text-xs text-slate-400 italic">Sélectionnez un bon de commande à gauche pour visualiser les métadonnées.</div>
            )}
        </div>
    );
}