import { Plus } from "lucide-react";
import NormalSelector from "../../_components/normal-selector";
import { ProductFormProps } from "../types";

export function ProductForm({
    form,
    dispatch,
    autoFilling,
    autoFillSuccess,
    odooProductCategories,
    odooPosCategories,
    onSubmit,
    onHsCodeBlur
}: ProductFormProps) {
    return (
        <form onSubmit={onSubmit} className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center gap-2">
                <Plus className="text-indigo-600 w-4 h-4" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Ajouter un produit (Feuille : Produits)
                </h2>
            </div>

            {/* SECTION A: Saisie brute */}
            <div className="space-y-4">
                <h3 className="text-[9px] font-black text-indigo-500 uppercase">1. Saisie Code HS & Quantités</h3>
                <div className="sm:col-span-7 space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Code HS / Code Douanier
                        </label>
                        {autoFilling && (
                            <span className="text-[8px] font-black uppercase text-indigo-500 animate-pulse">
                                Recherche Odoo...
                            </span>
                        )}
                        {autoFillSuccess === true && (
                            <span className="text-[8px] font-black uppercase text-emerald-500">
                                Prerempli depuis Odoo ✓
                            </span>
                        )}
                        {autoFillSuccess === false && (
                            <span className="text-[8px] font-bold uppercase text-slate-400">
                                Nouveau produit (Saisie manuelle)
                            </span>
                        )}
                    </div>
                    <input
                        type="text"
                        required
                        placeholder="Ex: 3304.99.00 (Cosmétiques)"
                        value={form.codeHs}
                        onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "codeHs", value: e.target.value })}
                        onBlur={onHsCodeBlur}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-medium outline-none text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 h-10 transition-all"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Nom du Produit</label>
                        <input type="text" required value={form.nom} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "nom", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Quantité physique</label>
                        <input type="number" required min={1} value={form.quantity} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "quantity", value: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                </div>
            </div>

            {/* SECTION B: Caractéristiques et Dimensions */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                <h3 className="text-[9px] font-black text-indigo-500 uppercase">2. Caractéristiques & Typologie</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Marque</label>
                        <input type="text" value={form.marque} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "marque", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Catégorie</label>
                        <input type="text" value={form.categorie} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "categorie", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Famille</label>
                        <input type="text" value={form.famille} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "famille", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Couleur</label>
                        <input type="text" value={form.couleur} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "couleur", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Taille</label>
                        <input type="text" value={form.taille} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "taille", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Catégorie Article</label>
                        <NormalSelector
                            data={odooProductCategories}
                            selected={form.categorieArticle}
                            onSelect={(value) => dispatch({ type: "UPDATE_FIELD", field: "categorieArticle", value: value.name })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Catégorie PdV</label>
                        <select
                            value={form.categoriePdv}
                            onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "categoriePdv", value: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-semibold h-9 outline-none cursor-pointer"
                        >
                            <option value="">Sélectionner une catégorie PdV...</option>
                            {odooPosCategories.map((cat) => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Date Expiration</label>
                        <input type="text" placeholder="Ex: 2026-12" value={form.dateExpiration} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "dateExpiration", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Description</label>
                    <input type="text" value={form.description} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "description", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                </div>
            </div>

            {/* SECTION C: Tarification, Taxes & Codes */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                <h3 className="text-[9px] font-black text-indigo-500 uppercase">3. Tarification, Codes & Remises</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Prix d'Achat (PU)</label>
                        <input type="number" step="0.01" value={form.pu} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "pu", value: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Coeff (CAA)</label>
                        <input type="number" step="0.01" value={form.caa} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "caa", value: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Prix de vente public</label>
                        <input type="number" step="0.01" value={form.prix} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "prix", value: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Code Remise</label>
                        <input type="text" value={form.codeRemise} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "codeRemise", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Code Fournisseur</label>
                        <input type="text" value={form.codeFournisseur} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "codeFournisseur", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-400">HS +</label>
                        <input type="text" value={form.hsPlus} onChange={(e) => dispatch({ type: "UPDATE_FIELD", field: "hsPlus", value: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-medium h-9 outline-none" />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-end">
                <button type="submit" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold shadow-sm">
                    <Plus size={14} /> Ajouter cette ligne de produit
                </button>
            </div>
        </form>
    );
}