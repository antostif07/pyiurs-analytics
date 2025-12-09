"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from "@tanstack/react-table";
import { 
  ChevronLeft, ChevronRight, Search, 
  AlertCircle, CheckCircle, XCircle, Clock, Package
} from "lucide-react";
import { StockProduct, StockResponse } from "../types";

// --- BADGES DE STATUT ---
const StatusBadge = ({ status }: { status: StockProduct['status'] }) => {
  const styles = {
    critical: "bg-red-100 text-red-700 border-red-200",
    low: "bg-orange-100 text-orange-700 border-orange-200",
    ok: "bg-emerald-100 text-emerald-700 border-emerald-200",
    overstock: "bg-blue-100 text-blue-700 border-blue-200",
    dormant: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const labels = {
    critical: "Rupture",
    low: "Faible",
    ok: "Bon",
    overstock: "Surstock",
    dormant: "Dormant",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// --- TABLE COMPONENT ---

export default function StocksTable({ initialData }: { initialData: StockResponse }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // État local pour la recherche (debounce)
  const [search, setSearch] = useState(searchParams.get("q") || "");
  
  // Colonnes
  const columnHelper = createColumnHelper<StockProduct>();
  
  const columns = [
    columnHelper.accessor("name", {
      header: "Produit / Réf",
      cell: (info) => (
        <div>
          <div className="font-medium text-slate-900">{info.getValue()}</div>
          <div className="text-xs text-slate-500 font-mono">{info.row.original.ref}</div>
        </div>
      ),
    }),
    columnHelper.accessor("stock", {
      header: "En Stock",
      cell: (info) => (
        <span className={`font-bold ${info.getValue() === 0 ? "text-red-600" : "text-slate-700"}`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("dailySales", {
      header: "Ventes / Jour",
      cell: (info) => (
        <div className="text-slate-600">
          {info.getValue() > 0 ? info.getValue().toFixed(1) : "-"}
        </div>
      ),
    }),
    columnHelper.accessor("daysRemaining", {
      header: "Couverture (Jours)",
      cell: (info) => {
        const val = info.getValue();
        if (val > 365) return <span className="text-slate-400">∞</span>;
        
        let color = "text-slate-600";
        if (val < 15) color = "text-orange-600 font-bold";
        if (val < 5) color = "text-red-600 font-bold";

        return <span className={color}>{val}j</span>;
      },
    }),
    columnHelper.accessor("restockQty", {
      header: "Suggestion", // Suggestion de commande
      cell: (info) => {
        const val = info.getValue();
        return val > 0 ? (
          <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">
            +{val}
          </span>
        ) : (
          <span className="text-slate-300">-</span>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Statut",
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ];

  const table = useReactTable({
    data: initialData.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Pagination gérée par le serveur
    pageCount: initialData.meta.pageCount,
  });

  // Gestion Pagination via URL
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/analyse-femme/stocks?${params.toString()}`);
  };

  // Gestion Recherche avec Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      
      // Reset page à 1 lors d'une recherche
      if (search !== searchParams.get("q")) params.set("page", "1");
      
      router.push(`/analyse-femme/stocks?${params.toString()}`);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [search, router, searchParams]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher produit ou référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-medium text-slate-900">{initialData.meta.total}</span> résultats
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialData.data.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center">
                    <Package className="w-8 h-8 mb-2 opacity-50" />
                    Aucun produit trouvé.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="text-sm text-slate-500">
          Page <span className="font-medium">{initialData.meta.page}</span> sur <span className="font-medium">{initialData.meta.pageCount}</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handlePageChange(Math.max(1, initialData.meta.page - 1))}
            disabled={initialData.meta.page === 1}
            className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(Math.min(initialData.meta.pageCount, initialData.meta.page + 1))}
            disabled={initialData.meta.page >= initialData.meta.pageCount}
            className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}