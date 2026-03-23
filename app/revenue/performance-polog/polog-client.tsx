"use client"

import React, { useMemo, useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, TrendingUp, DollarSign, Package, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function PologPerformanceClient({ initialData, allPurchaseOrders }: { initialData: any[]; allPurchaseOrders: string[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedPo, setSelectedPo] = useState<string>("all");
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    let filtered = initialData;

    // Filtre par Purchase Order
    if (selectedPo !== "all") {
      filtered = filtered.filter(item => 
        item.purchaseOrders.includes(selectedPo)
      );
    }

    return filtered;
  }, [initialData, selectedPo])

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "polog",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          POLOG ID <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link href={`performance-polog/${encodeURIComponent(row.getValue("polog"))}`} className="font-bold text-blue-600 hover:underline">
            {row.getValue("polog")}
        </Link>
      ),
    },
    {
      accessorKey: "productCount",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          Articles <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("productCount")}</span>,
    },
    {
      accessorKey: "qtyReceived",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          Reçus <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-bold text-slate-700">{row.getValue("qtyReceived")?.toLocaleString() ?? 0}</span>,
    },
    {
      accessorKey: "qtySold",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          Vendus <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("qtySold")}</span>,
    },
    {
      accessorKey: "totalPurchaseValue",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          Valeur Achat <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-slate-500 font-medium">
          ${(row.getValue("totalPurchaseValue") as number).toLocaleString(undefined, {maximumFractionDigits: 2, minimumFractionDigits: 2})}
        </span>
      ),
    },
    {
      accessorKey: "totalRevenue",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          CA Réalisé <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-semibold text-slate-900">${(row.getValue("totalRevenue") as number).toLocaleString()}</span>,
    },
    {
      accessorKey: "netProfit",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          Bénéfice Réel <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const val = row.getValue("netProfit") as number;
        return (
          <span className={`font-bold ${val >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ${val.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: "roi",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          % Récup. <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const roi = row.getValue("roi") as number;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={roi >= 100 ? "secondary" : "default"} className={roi >= 100 ? "bg-green-100 text-green-700" : ""}>
              {roi.toFixed(1)}%
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "margin",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-bold text-[11px] uppercase tracking-wider"
        >
          Marge <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const margin = row.getValue("margin") as number;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 w-12 bg-slate-100 rounded-full h-1.5 hidden md:block">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}></div>
            </div>
            <span className="text-xs font-bold">{margin}%</span>
          </div>
        );
      },
    },
    ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  const totals = useMemo(() => {
    return filteredData .reduce((acc, curr) => ({
      rev: acc.rev + curr.totalRevenue,
      prof: acc.prof + curr.netProfit,
      qty: acc.qty + curr.qtySold
    }), { rev: 0, prof: 0, qty: 0 });
  }, [initialData, filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Rechercher un POLOG..." 
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-9 border-slate-200"
          />
        </div>

        {/* Filtre Purchase Order */}
        <div className="w-full md:w-64">
          <Select value={selectedPo} onValueChange={setSelectedPo}>
            <SelectTrigger className="bg-slate-50 border-slate-200 font-medium">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Filtrer par PO" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les commandes (PO)</SelectItem>
              {allPurchaseOrders.map(po => (
                <SelectItem key={po} value={po}>{po}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Revenu sur période" value={`$${totals.rev.toLocaleString()}`} icon={<DollarSign className="text-blue-600" />} />
        <KpiCard title="Bénéfice Réalisé" value={`$${totals.prof.toLocaleString()}`} icon={<TrendingUp className="text-emerald-600" />} />
        <KpiCard title="Volume Vendu" value={`${totals.qty.toLocaleString()} pces`} icon={<Package className="text-orange-600" />} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Filtrer par POLOG..." 
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-slate-100">
                  {hg.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-50">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-slate-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Affichage de {table.getState().pagination.pageIndex * 10 + 1} à {Math.min((table.getState().pagination.pageIndex + 1) * 10, initialData.length)} sur {initialData.length} POLOG
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs font-semibold px-3 text-slate-600">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </div>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</CardTitle>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  )
}