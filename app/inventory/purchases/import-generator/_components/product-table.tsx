import { DownloadCloud, Tag, Trash2 } from "lucide-react";
import { ProductTableProps } from "../types";

export function ProductTable({
    products,
    onRemove,
    onExport,
    polog,
    dateChargement
}: ProductTableProps) {
    return (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                <Tag className="text-indigo-600 w-4 h-4" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Lignes de produits enregistrées ({products.length})
                </h2>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-900 text-slate-200">
                        <tr>
                            <th className="px-3 py-2">Nom</th>
                            <th className="px-3 py-2">Code HS</th>
                            <th className="px-3 py-2 text-right">Qté Globale</th>
                            <th className="px-3 py-2 text-right">PU</th>
                            <th className="px-3 py-2 text-right">Cout Calc.</th>
                            <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {products.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{p.nom}</td>
                                <td className="px-3 py-2 font-mono text-slate-500">{p.code_hs}</td>
                                <td className="px-3 py-2 text-right font-black italic">{p.quantity}</td>
                                <td className="px-3 py-2 text-right font-mono">${p.pu}</td>
                                <td className="px-3 py-2 text-right font-mono">${(p.pu * p.caa).toFixed(2)}</td>
                                <td className="px-3 py-2 text-center">
                                    <button type="button" onClick={() => onRemove(p.id)} className="text-rose-500 hover:text-rose-600 p-1">
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    onClick={onExport}
                    disabled={!polog.trim() || !dateChargement}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-wider shadow-md transition-all"
                >
                    <DownloadCloud size={14} /> Générer le fichier Excel final
                </button>
            </div>
        </div>
    );
}