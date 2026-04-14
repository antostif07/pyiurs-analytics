"use client";
import { Badge } from "@/components/ui/badge";
import { User, Phone, ShoppingBag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArpuTableProps {
  data: {
    id: string;
    revenue: number;
    orderCount: number;
    arpu: number;
  }[];
}

export default function ArpuTable({ data = [] }: ArpuTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Top Clients par Revenu</h3>
          <p className="text-xs text-muted-foreground">Classement basé sur l'identifiant unique (Mobile ou Partner ID)</p>
        </div>
        <Badge variant="outline" className="rounded-lg">{data.length} Clients affichés</Badge>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Identifiant Client</th>
              <th className="px-6 py-4 text-right">Volume Achats</th>
              <th className="px-6 py-4 text-right">Fréquence (POS)</th>
              <th className="px-6 py-4 text-right">Contribution CA</th>
              <th className="px-6 py-4 text-center">Profil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.length > 0 ? (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        row.id.startsWith("PHONE") ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {row.id.startsWith("PHONE") ? <Phone className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {row.id.replace("PHONE-", "").replace("PARTNER-", "Client #")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {row.id.split("-")[0]}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">
                    {row.revenue.toLocaleString()} $
                  </td>
                  
                  <td className="px-6 py-4 text-right font-medium text-slate-600">
                    <div className="flex items-center justify-end gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 opacity-40" />
                      {row.orderCount} commandes
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-slate-900">{row.arpu.toLocaleString()} $</span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500" 
                          style={{ width: `${Math.min(100, (row.revenue / data[0].revenue) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {row.revenue > 500 ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 font-bold">VIP</Badge>
                      ) : row.orderCount > 3 ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 font-bold">Fidèle</Badge>
                      ) : (
                        <Badge variant="secondary" className="px-3">Standard</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  Aucun client trouvé sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
        <button className="text-xs font-bold text-indigo-600 flex items-center gap-2 hover:underline">
          Voir le rapport client complet <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}