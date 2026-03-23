"use client"

import React, { useMemo, useState } from 'react'
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel, 
  getExpandedRowModel, 
  SortingState,
  ExpandedState 
} from "@tanstack/react-table"
import { ChevronRight, ChevronDown, Package, TrendingUp, DollarSign, ShoppingBag, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ProductImage from '@/app/marketing/components/ProductImage'
import { Button } from '@/components/ui/button'

export default function PologDetailClient({ data }: { data: any }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "displayName",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
        >
          Groupe / Produit
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => {
        const isGroup = row.getCanExpand();
        const image = row.original.image;
        const name = isGroup ? row.original.displayName : row.original.name;

        return (
          <div className="flex items-center gap-3 w-90" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
            {isGroup ? (
              <button 
                onClick={row.getToggleExpandedHandler()} 
                className="cursor-pointer p-1 hover:bg-slate-100 rounded"
              >
                {row.getIsExpanded() ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
              </button>
            ) : <div className="w-6" />}
            
            <div className="relative h-10 w-10 min-w-[40px] rounded-lg border bg-slate-50 overflow-hidden flex items-center justify-center border-slate-100">
              {image ? (
                <ProductImage src={`https://images.bybkm.fr/${image}`}  alt={'product-image'} />
              ) : (
                <Package className="h-4 w-4 text-slate-300" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className={`leading-tight truncate ${isGroup ? 'font-bold text-slate-900 text-sm' : 'text-slate-500 text-[10px]'}`}>
                {name || "Produit sans nom"}
              </span>
              {isGroup && (
                <div className="flex gap-2 mt-1">
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-blue-100">
                    {row.original.hsCode}
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200">
                    {row.original.color}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      },
      size: 80,
    },
    {
      accessorKey: "qtyOrdered",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
        >
          Commandés
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
    },
    {
      accessorKey: "qtyReceived",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
        >
          Reçus
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
    },
    {
      accessorKey: "qtySold",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
        >
          Vendus
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
    },
    {
      accessorKey: "revenue",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
        >
          CA Réalisé
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => {
        const val = row.getValue("revenue") as number;
        return <span className="font-semibold text-slate-900">${(val ?? 0).toLocaleString()}</span>
      },
    },
    {
      accessorKey: "profit",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors uppercase"
        >
          Bénéfice
          <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => {
        const profit = row.getValue("profit") as number;
        return (
          <span className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ${(profit ?? 0).toLocaleString()}
          </span>
        )
      }
    }
  ], []);

  const table = useReactTable({
    data: data?.groups ?? [],
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getSubRows: row => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Calcul du ROI en toute sécurité
  const totalRev = data?.summary?.totalRevenue ?? 0;
  const totalInvest = data?.summary?.totalInvestment ?? 0;
  const roi = totalInvest > 0 ? (totalRev / totalInvest) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{data?.pologId}</h1>
          <p className="text-slate-500 text-sm italic">Analyse par HS Code</p>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Récupération :</span>
            <Badge className={`text-sm font-black px-4 ${roi >= 100 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600'}`}>
            {roi.toFixed(1)}%
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard 
            title="Ventes Totales" 
            value={`$${(data?.summary?.totalRevenue ?? 0).toLocaleString()}`} 
            icon={<DollarSign className="h-4 w-4 text-emerald-600" />} 
        />
        <SummaryCard 
            title="Bénéfice Net" 
            value={`$${(data?.summary?.totalProfit ?? 0).toLocaleString()}`} 
            icon={<TrendingUp className="h-4 w-4 text-blue-600" />} 
        />
        <SummaryCard 
            title="Articles Vendus" 
            value={(data?.summary?.totalSold ?? 0).toLocaleString()} 
            icon={<ShoppingBag className="h-4 w-4 text-orange-600" />} 
        />
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setExpanded(true)}
        >
          Tout ouvrir
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setExpanded({})}
        >
          Tout fermer
        </Button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                        {hg.headers.map(header => (
                        <th
                            key={header.id}
                            className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-20"
                            >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                        ))}
                    </tr>
                    ))}
                </thead>
            <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.map(row => {
                const isGroup = row.getCanExpand();
                return (
                    <tr key={row.id} className={`${isGroup ? 'bg-white' : 'bg-slate-50/40'} transition-colors hover:bg-blue-50/30`}>
                    {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-2 py-1 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                    ))}
                    </tr>
                )
                })}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</CardTitle>
        <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}