'use client'

import { Column, ColumnDef } from "@tanstack/react-table";
import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProductImage from "../marketing/components/ProductImage";

// --- Utilitaires ---

function getStockColor(qty: number): string {
  if (qty <= 0) return 'bg-black text-white';
  if (qty <= 5) return 'bg-red-500 text-white';
  if (qty <= 11) return 'bg-yellow-500 text-black';
  return 'bg-green-500 text-white';
}

function getDaysColor(days: number): string {
  if (days <= 7) return 'text-red-600 font-bold';
  if (days <= 14) return 'text-orange-600';
  if (days <= 30) return 'text-yellow-600';
  return 'text-green-600';
}

// Composant Header réutilisable pour éviter la duplication
const SortableHeader = ({ column, title, align = "center" }: { column: Column<ControlStockBeautyModel, unknown>, title: string, align?: "left" | "center" | "right" }) => {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className={`h-auto px-0 text-xs font-semibold ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}
    >
      {title}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )
}

// Composant Image + Tooltip
function ProductNameWithTooltip({ name, brand, color, hs_code }: { 
  name: string; brand: string; color: string; hs_code: string;
}) {
  const imageUrl = `http://pyiurs.com/images/images/${hs_code}_`;
  
  return (
    <div className="flex space-x-2 w-96">
      <div className="h-16 w-16 relative">
         {/* Ajoute un fallback si l'image n'existe pas ou utilise next/image si possible */}
        <ProductImage src={`${imageUrl}.jpg`} alt={name} /> 
      </div>
      <div className="py-2 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="font-medium text-sm truncate cursor-help text-left" title={name}>
                {name}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="text-sm">{name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1 truncate">
          <span className="truncate">{brand}</span>
          {color && color !== 'Non spécifié' && (
            <>
              <span>•</span>
              <span className="text-blue-600 truncate">{color}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Définition des Colonnes ---

export const controlStockBeautyColumns: ColumnDef<ControlStockBeautyModel>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Produit" align="left" />,
    cell: ({ row }) => (
      <ProductNameWithTooltip 
        name={row.getValue("name")}
        brand={row.original.brand}
        color={row.original.color}
        hs_code={row.original.hs_code}
      />
    ),
    enableResizing: false,
  },
  {
    accessorKey: "product_qty",
    header: ({ column }) => <SortableHeader column={column} title="Ach." />,
    cell: ({ getValue }) => <span className="font-medium text-blue-600 text-sm">{getValue<number>()}</span>,
    size: 40,
  },
  {
    accessorKey: "qty_received",
    header: ({ column }) => <SortableHeader column={column} title="Reçu" />,
    cell: ({ getValue }) => <span className="font-medium text-green-600 text-sm">{getValue<number>()}</span>,
    size: 80,
  },
  {
    accessorKey: "not_received",
    header: ({ column }) => <SortableHeader column={column} title="Rlq" />,
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className={value > 0 ? "bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium" : "text-gray-400 text-sm"}>
          {value}
        </span>
      );
    },
    size: 90,
  },
  {
    accessorKey: "qty_sold",
    header: ({ column }) => <SortableHeader column={column} title="Ven." />,
    cell: ({ getValue }) => <span className="font-medium text-purple-600 text-sm">{getValue<number>()}</span>,
    size: 80,
  },
  {
    accessorKey: "qty_available",
    header: ({ column }) => <SortableHeader column={column} title="Disp." />,
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold text-center min-w-10 inline-block ${getStockColor(value)}`}>
          {value}
        </span>
      );
    },
    size: 80,
  },
  
  // --- Colonnes de Stock par Boutique (Maintenant Triables) ---
  
  {
    accessorKey: "stock_P24",
    header: ({ column }) => <SortableHeader column={column} title="P.24" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("stock_P24") || 0}</div>,
    size: 70,
  },
  {
    accessorKey: "stock_ktm",
    header: ({ column }) => <SortableHeader column={column} title="KTM" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("stock_ktm") || 0}</div>,
    size: 70,
  },
  {
    accessorKey: "stock_mto",
    header: ({ column }) => <SortableHeader column={column} title="MTO" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("stock_mto") || 0}</div>,
    size: 70,
  },
  {
    accessorKey: "stock_onl",
    header: ({ column }) => <SortableHeader column={column} title="ONL" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("stock_onl") || 0}</div>,
    size: 70,
  },
  {
    accessorKey: "stock_lmb",
    header: ({ column }) => <SortableHeader column={column} title="LMB" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("stock_lmb") || 0}</div>,
    size: 70,
  },
  {
    accessorKey: "stock_dc",
    header: ({ column }) => <SortableHeader column={column} title="DC" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("stock_dc") || 0}</div>,
    size: 70,
  },
  // {
  //   accessorKey: "stock_other",
  //   header: ({ column }) => <SortableHeader column={column} title="Autre" />,
  //   cell: ({ row }) => <div className="text-center">{row.getValue("stock_other") || 0}</div>,
  //   size: 70,
  // },
  {
    accessorKey: "sales_last_30_days",
    header: ({ column }) => <SortableHeader column={column} title="Ven. 7j" />,
    cell: ({ row }) => <div className="text-center">{row.getValue("sales_last_30_days") || 0}</div>,
    size: 70,
  },

  // --- Colonne Complexe avec Tri personnalisé par Date ---

  {
    id: "replenishment_metrics",
    // AccessorFn permet de dire à la table : "Voici la valeur à utiliser pour le tri"
    // Ici on utilise le timestamp de la date recommandée, ou 0 si pas de date
    accessorFn: (row) => {
        if (!row.recommended_reorder_date) return -1; // Les nulls en dernier ou premier selon le tri
        return new Date(row.recommended_reorder_date).getTime();
    },
    header: ({ column }) => <SortableHeader column={column} title="Réappro." align="left" />,
    cell: ({ row }) => {
      const sales30d = row.original.sales_last_30_days || 0;
      const dailyRate = row.original.daily_sales_rate || 0;
      const daysLeft = row.original.days_until_out_of_stock || 0;
      const reorderDate = row.original.recommended_reorder_date;
      const lastSaleDate = row.original.last_sale_date;

      if (sales30d === 0) {
        return (
          <div className="text-xs space-y-1">
            <div className="text-gray-400">Pas de vente</div>
            {lastSaleDate && (
              <div className="text-gray-500">
                Dern. vente: {new Date(lastSaleDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </div>
            )}
          </div>
        );
      }

      const daysColor = getDaysColor(daysLeft);

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs space-y-1 cursor-help">
                <div className="flex justify-between">
                  <span>Jours rest.:</span>
                  <span className={`font-medium ${daysColor}`}>{daysLeft}j</span>
                </div>
                {reorderDate && (
                  <div className="flex justify-between">
                    <span>Commander:</span>
                    <span className="text-blue-600 font-medium">
                      {new Date(reorderDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </div>
                )}
                {lastSaleDate && (
                  <div className="flex justify-between text-gray-500">
                    <span>Dern. vente:</span>
                    <span>
                      {new Date(lastSaleDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-xs">
              <div className="space-y-2">
                <div><strong>Ventes sur 30 jours:</strong> {sales30d} unités</div>
                <div><strong>Ratio quotidien:</strong> {dailyRate.toFixed(2)} unités/jour</div>
                <div><strong>Jours avant rupture:</strong> <span className={daysColor}>{daysLeft} jours</span></div>
                {reorderDate && (
                  <div>
                    <strong>Commander avant:</strong> {new Date(reorderDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 140,
  },
];