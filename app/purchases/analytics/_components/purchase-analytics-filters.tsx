// components/purchases/purchase-analytics-filters.tsx

import { SlidersHorizontal } from "lucide-react";
import { Category, Segment } from "@/app/purchases/analytics/page"; // Ajustez l'import selon vos types

export interface OdooFilterOption {
  id: string | number;
  name: string;
}

export default function PurchaseAnalyticsFilters({
  selectedYear,
  setSelectedYear,
  selectedSegment,
  setSelectedSegment,
  selectedCategory,
  setSelectedCategory,
  selectedSupplier,
  setSelectedSupplier,
  selectedStatus,
  setSelectedStatus,
  selectedBrand,
  setSelectedBrand,
  
  // Nouveaux paramètres optionnels alimentés par Odoo
  categoryOptions = [],
  supplierOptions = [],
  brandOptions = []
}: {
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedSegment: Segment;
  setSelectedSegment: (value: Segment) => void;
  selectedCategory: Category;
  setSelectedCategory: (value: Category) => void;
  selectedSupplier: string;
  setSelectedSupplier: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedBrand: string;
  setSelectedBrand: (value: string) => void;

  // Typage des options dynamiques Odoo
  categoryOptions?: OdooFilterOption[];
  supplierOptions?: OdooFilterOption[];
  brandOptions?: OdooFilterOption[];
}) {
  return (
    <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-900 pb-2">
        <SlidersHorizontal size={13} className="text-indigo-600" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Filtres de consolidation consolidés
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Année */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Exercice</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>

        {/* Segment */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Segment</label>
          <select 
            value={selectedSegment} 
            onChange={(e) => setSelectedSegment(e.target.value as Segment)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="All">Tous les segments</option>
            <option value="Beauty">Beauty</option>
            <option value="Femme">Femme</option>
            <option value="Kid">Kid</option>
          </select>
        </div>

        {/* Catégories (Dynamiques) */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Catégorie</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value as Category)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="All">Toutes catégories</option>
            {categoryOptions.map((cat, idx) => (
              <option key={`${cat.id}-${idx}`} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fournisseurs (Dynamiques) */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Fournisseur</label>
          <select 
            value={selectedSupplier} 
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="All">Tous (Odoo Sync)</option>
            {supplierOptions.map((sup, idx) => (
              <option key={`sup.id-${idx}`} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        {/* Statuts */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Statut PO</label>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="All">Tous statuts</option>
            <option value="Approved">Approuvé</option>
            <option value="Delivered">Livré</option>
            <option value="Pending">En cours</option>
          </select>
        </div>

        {/* Marque (Dynamique) */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Marque</label>
          <select 
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="All">Toutes marques</option>
            {brandOptions.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Odoo Instance Info */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Instance ERP</label>
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 text-center uppercase tracking-tighter select-none">
            Active : Odoo Production
          </div>
        </div>
      </div>
    </div>
  );
}