"use client";
import { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, createColumnHelper, SortingState } from "@tanstack/react-table";
import { ArrowUpDown, TrendingUp } from "lucide-react";

export default function RetentionTable({ clients, globalFilter, statusFilter, onClientClick }: any) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: ({ column }) => <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>Client <ArrowUpDown className="w-3 h-3" /></button>,
      cell: (info) => <div className="font-bold text-[11px] uppercase truncate max-w-[150px]">{info.getValue()}</div>,
    }),
    columnHelper.accessor("spentRef", {
      header: "CA Ref",
      cell: (info) => <div className="text-[10px] font-bold text-slate-400 italic">{(info.getValue() || 0).toLocaleString()} $</div>,
    }),
    columnHelper.accessor("returned", {
      header: "Status",
      filterFn: (row, id, value) => {
        if (value === "returned") return row.getValue(id) === true;
        if (value === "missing") return row.getValue(id) === false;
        return true;
      },
      cell: (info) => info.getValue() ? (
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase">Revenu</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-300 text-[8px] font-black uppercase italic">Absent</span>
      ),
    }),
    columnHelper.accessor("spentCur", {
      header: "CA Actuel",
      cell: (info) => <div className={`text-right font-black italic text-xs ${info.row.original.returned ? 'text-indigo-600' : 'text-slate-200'}`}>{(info.getValue() || 0).toLocaleString()} $</div>,
    }),
  ], []);

  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting, globalFilter, columnFilters: [{ id: "returned", value: statusFilter === "all" ? undefined : statusFilter }] },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 border-b border-slate-100">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-900 dark:text-slate-100">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} onClick={() => onClientClick(row.original)} className="hover:bg-indigo-50/50 cursor-pointer transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-8 py-3.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}