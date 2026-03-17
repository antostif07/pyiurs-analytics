'use client'

import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  Column,
  SortingState,
} from '@tanstack/react-table';
import { getPaginatedInventory, InventoryGroup } from './actions';
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ProductImage from '@/app/marketing/components/ProductImage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

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

const SortableHeader = ({ column, title, align = "center" }: { column: Column<InventoryGroup, unknown>, title: string, align?: "left" | "center" | "right" }) => {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className={`p-2 h-auto text-xs font-semibold w-full ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}
    >
      {title}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )
}

function StockBadge({ qty }: { qty: number }) {
  let bgColor = "bg-emerald-500"; // Bon stock
  if (qty <= 0) bgColor = "bg-black"; // Rupture
  else if (qty <= 5) bgColor = "bg-red-500"; // Critique
  else if (qty <= 15) bgColor = "bg-amber-400"; // Faible

  return (
    <div className="flex justify-center">
      <span className={`${bgColor} text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[28px] text-center shadow-sm`}>
        {qty.toLocaleString()}
      </span>
    </div>
  );
}

const columns: ColumnDef<InventoryGroup>[] = [
    {
        accessorKey: "firstName",
        header: ({ column }) => <SortableHeader column={column} title="Produit" align="left" />,
        cell: ({ row }: { row: any }) => {
            console.log(row.original);
            
            return (
        <ProductNameWithTooltip 
            name={row.getValue("firstName")}
            brand={row.original.brand}
            color={row.original.gamme}
            hs_code={row.original.hsCode}
        />
        )
        },
        enableResizing: false,
    },
    {
        accessorKey: "totalPurchased",
        header: ({ column }) => <SortableHeader column={column} title="Achts" />,
        cell: ({ row }) => (
        <div className="text-center font-bold text-blue-600 text-sm">
            {row.original.totalPurchased.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "totalReceived",
        header: ({ column }) => <SortableHeader column={column} title="Reçu" />,
        cell: ({ row }) => (
        <div className="text-center font-bold text-emerald-600">
            {row.original.totalReceived.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "totalResidual",
        header: ({ column }) => <SortableHeader column={column} title="Rliq" />,
        cell: ({ row }) => (
        <div className={`text-center font-bold ${row.original.totalResidual > 0 ? 'text-gray-400' : 'text-gray-200'}`}>
            {row.original.totalResidual.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "totalSold",
        header: ({ column }) => <SortableHeader column={column} title="Vendu" />,
        cell: ({ row }) => (
        <div className="text-center font-bold text-purple-600">
            {row.original.totalSold.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "totalStock", // C'est notre "Dispo" (Somme des boutiques)
        header: ({ column }) => <SortableHeader column={column} title="Dispo" />,
        cell: ({ row }) => <StockBadge qty={row.original.totalStock} />,
    },
    {
        accessorKey: "stock_24",
        header: ({ column }) => <SortableHeader column={column} title="P.24" />,
        cell: ({ row }) => (
        <div className="text-center font-medium text-gray-600">
            {row.original.stock_pbc.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "stock_mto",
        header: ({ column }) => <SortableHeader column={column} title="P.MTO" />,
        cell: ({ row }) => (
        <div className="text-center font-medium text-gray-600">
            {row.original.stock_pbc.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "stock_lmb",
        header: ({ column }) => <SortableHeader column={column} title="P.LMB" />,
        cell: ({ row }) => (
        <div className="text-center font-medium text-gray-600">
            {row.original.stock_pbc.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "stock_ktm",
        header: ({ column }) => <SortableHeader column={column} title="P.KTM" />,
        cell: ({ row }) => (
        <div className="text-center font-medium text-gray-600">
            {row.original.stock_pbc.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "stock_onl",
        header: ({ column }) => <SortableHeader column={column} title="P.ONL" />,
        cell: ({ row }) => (
        <div className="text-center font-medium text-gray-600">
            {row.original.stock_pbc.toLocaleString()}
        </div>
        ),
    },
    {
        accessorKey: "stock_pbc",
        header: ({ column }) => <SortableHeader column={column} title="P.BC" />,
        cell: ({ row }) => (
        <div className="text-center font-medium text-gray-600">
            {row.original.stock_pbc.toLocaleString()}
        </div>
        ),
    },
];

export default function InventoryTable() {
  const [data, setData] = useState<InventoryGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Fetch des données quand la page change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // On extrait les infos de tri pour l'envoyer au serveur
      const sortBy = sorting.length > 0 ? sorting[0].id : 'totalStock';
      const sortDesc = sorting.length > 0 ? sorting[0].desc : true;

      const result = await getPaginatedInventory(pageIndex, pageSize, sortBy, sortDesc);
      
      setData(result.data);
      setTotalCount(result.totalCount);
      setLoading(false);
    };
    fetchData();
  }, [pageIndex, pageSize, sorting]);

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalCount / pageSize),
    state: { 
        pagination: { pageIndex, pageSize },
        sorting
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // On gère la pagination côté serveur/action
    manualSorting: true,  // On gère le tri côté serveur/action
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-pink-500" />
              </div>
            )}
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 text-sm text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-gray-500 font-medium">
          Total : {totalCount} modèles
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-2 border rounded-lg disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold">
            Page {pageIndex + 1} sur {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-2 border rounded-lg disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}