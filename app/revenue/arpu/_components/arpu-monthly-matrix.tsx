"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export default function ArpuMonthlyMatrix({ data }: { data: any[] }) {
  const [year, setYear] = useState(2024);

  const rows = [
    { label: "REVENU TOTAL", key: "revenue", format: (v: number) => `${v.toLocaleString()} $`, bold: true, bg: "bg-slate-50 dark:bg-slate-800/50" },
    { label: "ARPU", key: "arpu", format: (v: number) => `${v.toFixed(2)} $`, color: "text-indigo-600 font-bold" },
    { label: "BASE CLIENTS (Phones)", key: "base", format: (v: number) => v.toLocaleString() },
    { label: "--- SEGMENTS ---", isHeader: true },
    { label: "Revenu Femme", key: "femme", format: (v: number) => `${v.toLocaleString()} $` },
    { label: "Revenu Enfant", key: "enfant", format: (v: number) => `${v.toLocaleString()} $` },
    { label: "Revenu Beauty", key: "beauty", format: (v: number) => `${v.toLocaleString()} $` },
    { label: "--- COHORTES ---", isHeader: true },
    { label: "Acquisitions (Nombre)", key: "acqCount", format: (v: number) => v.toLocaleString(), color: "text-emerald-600" },
    { label: "Acquisitions (Revenu)", key: "acqRev", format: (v: number) => `${v.toLocaleString()} $` },
    { label: "Récurrents (Nombre)", key: "recCount", format: (v: number) => v.toLocaleString(), color: "text-blue-600" },
    { label: "Récurrents (Revenu)", key: "recRev", format: (v: number) => `${v.toLocaleString()} $` },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Header Table */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><CalendarDays className="w-5 h-5"/></div>
            <h3 className="text-xl font-bold">Récapitulatif Annuel</h3>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft className="w-4 h-4"/></button>
            <span className="px-4 font-black text-sm">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="sticky left-0 z-20 bg-white dark:bg-slate-900 px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[220px]">Indicateurs</th>
              {data.map((m) => (
                <th key={m.label} className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase min-w-[120px]">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={cn(
                "group transition-colors",
                row.isHeader ? "bg-slate-50/50 dark:bg-slate-800/20" : "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10",
                row.bg
              )}>
                <td className={cn(
                  "sticky left-0 z-10 px-6 py-3 text-xs font-bold border-r border-slate-100 dark:border-slate-800",
                  row.isHeader ? "text-slate-400 py-1" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300",
                  row.bold && "text-sm text-slate-900 dark:text-white"
                )}>
                  {row.label}
                </td>
                {row.isHeader ? (
                   <td colSpan={12} className="h-8"></td>
                ) : (
                  data.map((m, j) => (
                    <td key={j} className={cn(
                      "px-6 py-3 text-center text-xs font-medium font-mono tabular-nums",
                      row.color,
                      row.bold && "font-bold text-sm"
                    )}>
                      {row.format ? row.format(m[row.key as keyof typeof m]) : m[row.key as unknown as keyof typeof m]}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}