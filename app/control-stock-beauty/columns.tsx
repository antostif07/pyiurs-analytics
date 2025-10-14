'use client'

import { ColumnDef } from "@tanstack/react-table";
import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Fonction pour déterminer la couleur en fonction du stock
function getStockColor(qty: number): string {
  if (qty <= 0) return 'bg-black text-white';
  if (qty <= 5) return 'bg-red-500 text-white';
  if (qty <= 11) return 'bg-yellow-500 text-black';
  return 'bg-green-500 text-white';
}

// Fonction pour déterminer la couleur en fonction des jours restants
function getDaysColor(days: number): string {
  if (days <= 7) return 'text-red-600 font-bold';
  if (days <= 14) return 'text-orange-600';
  if (days <= 30) return 'text-yellow-600';
  return 'text-green-600';
}

// Composant pour afficher le nom avec tooltip
function ProductNameWithTooltip({ name, brand, color, hs_code }: { 
  name: string; 
  brand: string; 
  color: string; 
  hs_code: string;
}) {
  const imageUrl = `https://images.pyiurs.com/images/${hs_code}_`;
  
  return (
    <div className="flex space-x-2 w-96">
      {/* <SmartImage baseName={imageUrl} /> */}
      {/* <picture>
        <source srcSet={`${imageUrl}.webp`} type="image/webp" />
        <source srcSet={`${imageUrl}.jpg`} type="image/jpg" />
        <source srcSet={`${imageUrl}.png`} type="image/png" />
        <img
          src={`${imageUrl}.jpg`}
          alt={name}
          className="w-12 h-12 object-cover rounded flex-shrink-0"
          onError={(e) => (e.currentTarget.src = "/file.svg")}
        />
      </picture> */}
      <img
          src={`${imageUrl}.jpg`}
          alt={name}
          className="w-12 h-12 object-cover rounded flex-shrink-0"
          onError={(e) => (e.currentTarget.src = "/file.svg")}
        />
      <div className="py-2 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="font-medium text-sm truncate cursor-help" title={name}>
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

export const controlStockBeautyColumns: ColumnDef<ControlStockBeautyModel>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold w-full justify-start"
        >
          Produit
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <ProductNameWithTooltip 
          name={row.getValue("name")}
          brand={row.original.brand}
          color={row.original.color}
          hs_code={row.original.hs_code}
        />
      );
    },
    enableResizing: false,
  },
  {
    accessorKey: "product_qty",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Achts
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className="font-medium text-blue-600 text-sm">
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "qty_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Reçu
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className="font-medium text-green-600 text-sm">
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "not_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Rlq
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Vendu
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className="font-medium text-purple-600 text-sm">
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "qty_available",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Dispo
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      const colorClass = getStockColor(value);
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold text-center min-w-10 inline-block ${colorClass}`}>
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "stock_P24",
    header: "P.24",
    cell: ({ row }) => {
      const stock = row.getValue("stock_P24") as number;
      return <div className="text-center">{stock || 0}</div>;
    },
    size: 70,
  },
  {
    accessorKey: "stock_ktm",
    header: "KTM",
    cell: ({ row }) => {
      const stock = row.getValue("stock_ktm") as number;
      return <div className="text-center">{stock || 0}</div>;
    },
    size: 70,
  },
  {
    accessorKey: "stock_mto",
    header: "MTO",
    cell: ({ row }) => {
      const stock = row.getValue("stock_mto") as number;
      return <div className="text-center">{stock || 0}</div>;
    },
    size: 70,
  },
  {
    accessorKey: "stock_onl",
    header: "ONL",
    cell: ({ row }) => {
      const stock = row.getValue("stock_onl") as number;
      return <div className="text-center">{stock || 0}</div>;
    },
    size: 70,
  },
  {
  accessorKey: "stock_lmb",
  header: "LMB",
  cell: ({ row }) => {
    const stock = row.getValue("stock_lmb") as number;
    return <div className="text-center">{stock || 0}</div>;
  },
  size: 70,
},
  {
    accessorKey: "stock_dc",
    header: "DC",
    cell: ({ row }) => {
      const stock = row.getValue("stock_dc") as number;
      return <div className="text-center">{stock || 0}</div>;
    },
    size: 70,
  },
  {
    accessorKey: "stock_other",
    header: "Autre",
    cell: ({ row }) => {
      const stock = row.getValue("stock_other") as number;
      return <div className="text-center">{stock || 0}</div>;
    },
    size: 70,
  },
   {
    id: "replenishment_metrics",
    header: "Réapprovisionnement",
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
                  <span>Ventes 30j:</span>
                  <span className="font-medium">{sales30d}</span>
                </div>
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
                <div>
                  <strong>Ventes sur 30 jours:</strong> {sales30d} unités
                </div>
                <div>
                  <strong>Ratio quotidien:</strong> {dailyRate.toFixed(2)} unités/jour
                </div>
                <div>
                  <strong>Jours avant rupture:</strong> <span className={daysColor}>{daysLeft} jours</span>
                </div>
                {reorderDate && (
                  <div>
                    <strong>Commander avant:</strong> {new Date(reorderDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
                {lastSaleDate && (
                  <div>
                    <strong>Dernière vente:</strong> {new Date(lastSaleDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
                <div className="text-gray-500 text-xs mt-1">
                  * Basé sur les ventes des 30 derniers jours
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 140,
  },
];