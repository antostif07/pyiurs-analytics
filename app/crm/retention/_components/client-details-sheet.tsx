"use client";
import { useQuery } from "@tanstack/react-query";
import { getClientProductHistory } from "../actions";
import { X, ShoppingBag } from "lucide-react";

export default function ClientDetailsSheet({ client, onClose }: any) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["client-products", client?.id],
    queryFn: () => getClientProductHistory(client.id),
    enabled: !!client,
  });

  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl animate-in slide-in-from-right duration-300 p-8 overflow-y-auto">
        <div className="flex justify-between items-start mb-8 text-slate-900 dark:text-white">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">{client.name}</h3>
            <p className="text-[10px] font-black text-indigo-600 uppercase mt-1 italic">Détails de consommation</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center p-20 animate-pulse font-black text-[10px] uppercase opacity-40 tracking-widest">Récupération des articles...</div>
          ) : (
            products?.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg"><ShoppingBag className="w-4 h-4 text-indigo-500" /></div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase truncate max-w-[160px] text-slate-800 dark:text-slate-100">{p.name}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(p.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-black italic tracking-tighter text-slate-900 dark:text-white">{(p.price || 0).toLocaleString()} $</div>
                  <div className="text-[9px] font-bold text-indigo-600 uppercase">x{p.qty}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}