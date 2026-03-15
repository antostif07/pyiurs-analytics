'use client'

import { ColumnDef, Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { ControlStockFemmeModel } from "./page";
import ProductImage from "../marketing/components/ProductImage";

// ============================================================================
// 1. UTILITAIRES & COMPOSANTS RÉUTILISABLES (DRY Principle)
// ============================================================================

// Couleur dynamique du stock
const getStockColor = (qty: number): string => {
  if (qty <= 0) return 'bg-black text-white';
  if (qty <= 5) return 'bg-red-500 text-white';
  if (qty <= 11) return 'bg-yellow-500 text-black';
  return 'bg-green-500 text-white';
};

// Composant Header générique pour le tri
const SortableHeader = ({ column, title }: { column: any, title: string }) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    className="p-2 h-auto text-xs font-semibold hover:bg-slate-100"
  >
    {title}
    <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400" />
  </Button>
);

// Composant Cellule générique pour les badges de stock
const StockBadgeCell = ({ value }: { value: number }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-bold text-center min-w-[2.5rem] inline-block ${getStockColor(value)}`}>
    {value}
  </span>
);

// Fonction de filtre générique pour les plages de nombres (Range)
const numberRangeFilter = (row: Row<ControlStockFemmeModel>, id: string, filterValue:[number, number]) => {
  const value = Number(row.getValue(id));
  const[min, max] = filterValue ??[];
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
};

// Fonction de filtre générique pour les multi-selects
const multiSelectFilter = (row: Row<ControlStockFemmeModel>, id: string, filterValues: string[]) => {
  const value = row.getValue(id) as string;
  if (!filterValues?.length) return true;
  return filterValues.includes(value);
};

// ============================================================================
// 2. DÉFINITION DES COLONNES
// ============================================================================

export const controlStockBeautyColumns: ColumnDef<ControlStockFemmeModel>[] =[
  {
    accessorKey: "po_name",
    header: "PO",
    enableHiding: true,
    enableColumnFilter: true,
    // ✅ CORRECTION TS : Ajout de `type: "text"` (ou ce que ton interface exige)
    meta: { type: "text", filterVariant: "multi-select", label: "PO" },
    filterFn: multiSelectFilter,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Reference" />,
    cell: ({ row }) => {
      const { brand, color, imageUrl, name } = row.original;
      return (
        <div className="flex space-x-3 items-center">
          <div className="w-10 h-10 shrink-0">
            <ProductImage src={imageUrl} alt={name} />
          </div>
          <div className="py-1">
            <div className="font-medium text-sm text-slate-900 line-clamp-1">{name}</div>
            <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
              <span className="font-semibold">{brand}</span>
              {color && color !== 'Non spécifié' && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-blue-600 font-medium">{color}</span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    },
    enableColumnFilter: true,
    size: 300,
    meta: { type: "text", filterVariant: "multi-select", label: "Référence" },
    filterFn: multiSelectFilter,
  },
  {
    accessorKey: "product_qty",
    header: ({ column }) => <SortableHeader column={column} title="Achts" />,
    cell: ({ getValue }) => <span className="font-semibold text-blue-600 text-sm">{getValue<number>()}</span>,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Achats" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "qty_received",
    header: ({ column }) => <SortableHeader column={column} title="Reçu" />,
    cell: ({ getValue }) => <span className="font-semibold text-emerald-600 text-sm">{getValue<number>()}</span>,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Recu" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "not_received",
    header: ({ column }) => <SortableHeader column={column} title="Rlq" />,
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className={value > 0 ? "bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold" : "text-slate-400 text-sm"}>
          {value}
        </span>
      );
    },
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Rlq" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "qty_sold",
    header: ({ column }) => <SortableHeader column={column} title="Vendu" />,
    cell: ({ getValue }) => <span className="font-semibold text-purple-600 text-sm">{getValue<number>()}</span>,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Vendu" },
    filterFn: numberRangeFilter,
  },
  
  // ✅ PRO: Les colonnes de stock utilisent maintenant TOUTES le même composant StockBadgeCell !
  {
    accessorKey: "qty_available",
    header: ({ column }) => <SortableHeader column={column} title="Stock" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Dispo" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "stock_24",
    header: ({ column }) => <SortableHeader column={column} title="P.24" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "P.24" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "stock_ktm",
    header: ({ column }) => <SortableHeader column={column} title="P.KTM" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "P.KTM" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "stock_lmb",
    header: ({ column }) => <SortableHeader column={column} title="LMB" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "P.LMB" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "stock_mto",
    header: ({ column }) => <SortableHeader column={column} title="MTO" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "P.MTO" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "stock_onl",
    header: ({ column }) => <SortableHeader column={column} title="ONL" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "P.ONL" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "stock_dc",
    header: ({ column }) => <SortableHeader column={column} title="BC" />,
    cell: ({ getValue }) => <StockBadgeCell value={getValue<number>()} />,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "DC" },
    filterFn: numberRangeFilter,
  },
  {
    accessorKey: "age",
    id: "stock_age",
    header: ({ column }) => <SortableHeader column={column} title="Age" />,
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className={value > 0 ? "bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold" : "text-slate-400 text-sm"}>
          {value}
        </span>
      );
    },
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Age" },
    filterFn: numberRangeFilter,
  },
  
  // ✅ PRO: Optimisation de la colonne calculée "Perf"
  {
    id: "perf",
    header: ({ column }) => <SortableHeader column={column} title="Perf" />,
    // accessorFn crée la valeur virtuelle. Pas besoin d'une custom sortingFn, React Table va trier ce chiffre automatiquement !
    accessorFn: (row) => (row.qty_sold / (row.qty_received || 1)) * 100,
    cell: ({ getValue }) => (
      <span className="text-slate-500 font-medium text-sm">
        {getValue<number>().toFixed(2)}%
      </span>
    ),
    filterFn: (row, columnId, filterValue) => {
      const perf = row.getValue<number>(columnId);
      return perf >= Number(filterValue);
    },
    enableSorting: true,
    enableColumnFilter: true,
    size: 90,
    meta: { type: "number", filterVariant: "range", label: "Performance" },
  },
];