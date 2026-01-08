"use client";

import React from "react";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel,
  flexRender, 
  createColumnHelper 
} from "@tanstack/react-table";
import { 
  Crown, Heart, AlertOctagon, Sprout, User, Phone, Mail 
} from "lucide-react";
import { CustomerRFM } from "../actions/customers";

// --- BADGES RFM ---
const SegmentBadge = ({ segment }: { segment: CustomerRFM['segment'] }) => {
  const config = {
    VIP: { bg: "bg-amber-100", text: "text-amber-800", icon: Crown, label: "Champion" },
    LOYAL: { bg: "bg-purple-100", text: "text-purple-800", icon: Heart, label: "Fidèle" },
    AT_RISK: { bg: "bg-red-100", text: "text-red-800", icon: AlertOctagon, label: "À Risque" },
    NEW: { bg: "bg-emerald-100", text: "text-emerald-800", icon: Sprout, label: "Nouveau" },
    CASUAL: { bg: "bg-slate-100", text: "text-slate-600", icon: User, label: "Occasionnel" },
  };

  const C = config[segment] || config.CASUAL;
  const Icon = C.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${C.bg} ${C.text}`}>
      <Icon className="w-3 h-3" />
      {C.label}
    </div>
  );
};

export default function CustomerTable({ data }: { data: CustomerRFM[] }) {
  const columnHelper = createColumnHelper<CustomerRFM>();

  const columns = [
    columnHelper.accessor("name", {
      header: "Cliente",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{info.getValue()}</span>
          <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
            {info.row.original.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {info.row.original.phone}</span>}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("segment", {
      header: "Statut",
      cell: (info) => <SegmentBadge segment={info.getValue()} />,
    }),
    columnHelper.accessor("total_spent", {
      header: "CA Total (Femme)",
      cell: (info) => <span className="font-bold text-slate-700">{info.getValue().toLocaleString()} $</span>,
    }),
    columnHelper.accessor("order_count", {
      header: "Articles",
      cell: (info) => <span className="text-slate-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor("id", {
      header: "Action",
      cell: (info) => (
        <div className="flex gap-2">
            {info.row.original.phone && (
                <a 
                    href={`https://wa.me/${info.row.original.phone.replace(/\D/g, '')}`} 
                    target="_blank"
                    className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                    title="WhatsApp"
                >
                    <Phone className="w-4 h-4"/>
                </a>
            )}
            {info.row.original.email && (
                <a 
                    href={`mailto:${info.row.original.email}`}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    title="Email"
                >
                    <Mail className="w-4 h-4"/>
                </a>
            )}
        </div>
      )
    })
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination (Simplifiée) */}
      <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
         <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border rounded text-xs disabled:opacity-50">Précédent</button>
         <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border rounded text-xs disabled:opacity-50">Suivant</button>
      </div>
    </div>
  );
}