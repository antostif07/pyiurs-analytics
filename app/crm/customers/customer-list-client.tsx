"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender, 
  createColumnHelper, 
  SortingState, 
  GroupingState,
  getGroupedRowModel
} from "@tanstack/react-table";
import { getAllCustomers } from "./actions";
import { 
  Search, UserPlus, Download, ArrowUpDown, 
  MoreVertical, ArrowRight, Mail, Phone, MapPin, 
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { formatPhoneDisplay } from "../utils";

export default function CustomerListClient() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [grouping, setGrouping] = useState<GroupingState>(["normalized_phone"]);

  const { data: allCustomers = [], isLoading } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => getAllCustomers(),
  });

  // --- LOGIQUE D'EXPORT (Basée sur les données filtrées actuelles) ---
  const exportData = () => {
    const rowsToExport = table.getFilteredRowModel().rows.map(r => r.original);
    const headers = "ID,Nom,Email,Telephone,Ville,CA Total,Dernier Achat";
    const csv = rowsToExport.map(c => 
      `${c.id},"${c.name}","${c.email || ''}","${formatPhoneDisplay(c.phone) || ''}","${c.city || ''}",${c.total_spent},"${c.last_order_date || ''}"`
    ).join("\n");
    
    const blob = new Blob([headers + "\n" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `crm-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`${rowsToExport.length} clients exportés`);
  };

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    // --- COLONNE TÉLÉPHONE (PIVOT) ---
    columnHelper.accessor("normalized_phone", {
        header: "Téléphone (Groupe)",
        cell: ({ row, getValue }) => {
        const displayPhone = formatPhoneDisplay(row.subRows[0]?.original.phone || row.original.phone);
        return (
            <div className="flex items-center gap-2">
            {row.getCanExpand() && (
                <button onClick={row.getToggleExpandedHandler()} className="p-1 hover:bg-indigo-100 rounded text-indigo-600">
                {row.getIsExpanded() ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
            )}
            <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-800 tracking-tight">
                {displayPhone}
                </span>
                {row.getIsGrouped() && (
                <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1 w-fit">
                    {row.subRows.length} DOUBLONS
                </span>
                )}
            </div>
            </div>
        );
        },
    }),

    // --- COLONNE NOM ---
    columnHelper.accessor("name", {
        header: "Nom Client",
        cell: ({ row, getValue }) => (
        <div className={`flex items-center gap-2 ${row.getIsGrouped() ? "opacity-30 italic" : "ml-4"}`}>
            {!row.getIsGrouped() && (
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-[8px] text-slate-400 uppercase">
                {getValue().charAt(0)}
            </div>
            )}
            <span className="font-bold text-[10px] text-slate-700 truncate max-w-[120px] uppercase">
            {getValue()}
            </span>
        </div>
        ),
    }),

    // --- COLONNE PANIER MOYEN (NEW) ---
    columnHelper.accessor("average_basket", {
        header: "Panier Moyen",
        // Agrégation : Moyenne des paniers moyens du groupe
        aggregationFn: "mean",
        cell: ({ row, getValue }) => {
        const val = getValue() as number;
        return (
            <div className={`flex flex-col ${row.getIsGrouped() ? "text-indigo-600" : "text-slate-500"}`}>
            <span className="text-[10px] font-black italic tracking-tighter">
                {val.toLocaleString()} <span className="text-[8px] not-italic opacity-60">$</span>
            </span>
            <span className="text-[7px] font-bold uppercase opacity-40">Moyenne / Achat</span>
            </div>
        );
        },
    }),

    // --- COLONNE CA TOTAL ---
    columnHelper.accessor("total_spent", {
        header: ({ column }) => (
        <button className="flex items-center gap-1 ml-auto" onClick={() => column.toggleSorting()}>
            CA Total <ArrowUpDown className="w-2.5 h-2.5" />
        </button>
        ),
        aggregationFn: "sum",
        cell: ({ row, getValue }) => (
        <div className={`text-right font-black italic tracking-tighter ${row.getIsGrouped() ? "text-indigo-700 text-sm" : "text-xs text-slate-900"}`}>
            {(getValue() as number).toLocaleString()} 
            <span className="text-[8px] text-slate-400 not-italic ml-0.5 font-bold">$</span>
        </div>
        ),
    }),

    // --- COLONNE DERNIER ACHAT ---
    columnHelper.accessor("last_order_date", {
        header: "Dernier Achat",
        aggregationFn: "max",
        cell: ({ getValue }) => {
        const d = getValue() as string | false;
        return (
            <div className="text-[10px] font-bold text-slate-400 text-right">
            {d ? new Date(d).toLocaleDateString() : "---"}
            </div>
        );
        }
    }),

    // --- ACTIONS ---
    columnHelper.display({
        id: "actions",
        cell: ({ row }) => !row.getIsGrouped() && (
        <div className="flex justify-end gap-1">
            <button className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
            <ArrowRight className="w-4 h-4" />
            </button>
        </div>
        ),
    }),
    ], []);

  const table = useReactTable({
    data: allCustomers,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
    onGroupingChange: setGrouping,
    getGroupedRowModel: getGroupedRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* BARRE D'ACTIONS COMPACTE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Recherche globale..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-medium"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-xs font-bold"
          >
            <Download className="w-4 h-4 text-indigo-600" /> Exporter ({table.getFilteredRowModel().rows.length})
          </button>
          <button className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <UserPlus className="w-4 h-4" /> Nouveau Client
          </button>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse h-14"><td colSpan={6} className="px-6 bg-slate-50/10" /></tr>
                ))
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION LOCALE */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Affichage de {table.getRowModel().rows.length} sur {allCustomers.length} clients
          </p>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <button 
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-30"
              >
                Précédent
              </button>
              <button 
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-30"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}