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
  Crown, Heart, AlertOctagon, Sprout, User, Phone, Mail, 
  Download
} from "lucide-react";
import { CustomerRFM } from "../actions/customers";

const downloadCSV = (data: CustomerRFM[]) => {
  const headers = ["Nom", "Telephone", "Email", "Segment", "Depenses", "Articles", "Dernier Achat"];
  const rows = data.map(c => [
    `"${c.name}"`, // Guillemets pour gérer les virgules dans les noms
    c.phone,
    c.email,
    c.segment,
    c.total_spent,
    c.order_count,
    c.last_purchase
  ]);
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `clients_femme_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

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
             <span className="flex items-center gap-1">
               {/* Affichage des jours depuis visite */}
               {info.row.original.days_since_last}j sans achat
             </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("segment", {
      header: "Statut",
      cell: (info) => <SegmentBadge segment={info.getValue()} />,
    }),
    columnHelper.accessor("total_spent", {
      header: "CA Total",
      cell: (info) => <span className="font-bold text-slate-700">{info.getValue().toLocaleString()}</span>, // Ajoute ta devise
    }),
    columnHelper.accessor("id", {
      header: "Action",
      cell: (info) => (
        <div className="flex gap-2 justify-end">
            {/* Bouton WhatsApp avec le lien pré-calculé fiable */}
            {info.row.original.whatsapp_link && (
                <a 
                    href={`https://wa.me/${info.row.original.whatsapp_link}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors border border-green-200"
                    title="WhatsApp"
                >
                    <Phone className="w-4 h-4"/>
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
    <div className="space-y-4">
      {/* Barre d'outils au dessus du tableau */}
      <div className="flex justify-between items-center">
         <div className="text-sm text-slate-500">
            {data.length} clientes trouvées sur les 12 derniers mois
         </div>
         <button 
            onClick={() => downloadCSV(data)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50 font-medium"
         >
            <Download className="w-4 h-4" />
            Exporter CSV
         </button>
      </div>

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
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center">
           <span className="text-xs text-slate-400">
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
           </span>
           <div className="flex gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border rounded text-xs disabled:opacity-50 hover:bg-slate-50">Précédent</button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border rounded text-xs disabled:opacity-50 hover:bg-slate-50">Suivant</button>
           </div>
        </div>
      </div>
    </div>
  );
}