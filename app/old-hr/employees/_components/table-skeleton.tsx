// app/hr/employees/_components/table-skeleton.tsx
import { Card } from "@/components/ui/card";

export function TableSkeleton() {
  // On génère 8 lignes pour remplir l'écran
  const rows = Array.from({ length: 8 });

  return (
    <div className="space-y-4 animate-pulse">
      {/* 1. Squelette des Filtres */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="h-11 bg-slate-100 rounded-xl flex-1" />
        <div className="h-11 w-32 bg-slate-100 rounded-xl" />
      </div>

      {/* 2. Squelette de la Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 w-16"><div className="h-3 w-4 bg-slate-200 rounded mx-auto" /></th>
              <th className="px-6 py-4"><div className="h-3 w-24 bg-slate-200 rounded" /></th>
              <th className="px-6 py-4"><div className="h-3 w-32 bg-slate-200 rounded" /></th>
              <th className="px-6 py-4"><div className="h-3 w-20 bg-slate-200 rounded" /></th>
              <th className="px-6 py-4"><div className="h-3 w-28 bg-slate-200 rounded" /></th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((_, i) => (
              <tr key={i} className="bg-white">
                {/* Index */}
                <td className="px-6 py-5 text-center">
                  <div className="h-3 w-3 bg-slate-100 rounded mx-auto" />
                </td>
                
                {/* Collaborateur (Avatar + Texte) */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-100 rounded" />
                      <div className="h-3 w-20 bg-slate-50 rounded" />
                    </div>
                  </div>
                </td>

                {/* Affectation */}
                <td className="px-6 py-5">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-16 bg-slate-50 rounded" />
                  </div>
                </td>

                {/* Statut Odoo */}
                <td className="px-6 py-5">
                  <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                </td>

                {/* Salaire */}
                <td className="px-6 py-5">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-100 rounded" />
                    <div className="h-3 w-12 bg-slate-50 rounded" />
                  </div>
                </td>

                {/* Action Button */}
                <td className="px-6 py-5 text-right">
                  <div className="h-8 w-8 bg-slate-100 rounded-full ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Squelette de la Pagination */}
      <div className="flex justify-between items-center px-2 py-2">
        <div className="h-4 w-40 bg-slate-100 rounded" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-100 rounded-xl" />
          <div className="h-9 w-12 bg-slate-100 rounded-xl" />
          <div className="h-9 w-24 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}