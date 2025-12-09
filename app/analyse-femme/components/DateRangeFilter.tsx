"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// Si tu n'as pas installé date-fns: npm install date-fns

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Dates par défaut (30 derniers jours si vide)
  const defaultFrom = searchParams.get("from") || format(subDays(new Date(), 30), "yyyy-MM-dd");
  const defaultTo = searchParams.get("to") || format(new Date(), "yyyy-MM-dd");

  const [from, setFrom] = React.useState(defaultFrom);
  const [to, setTo] = React.useState(defaultTo);

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    params.set("page", "1"); // Reset pagination
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center px-3 py-1.5 text-sm text-slate-500 bg-slate-50 rounded-md border border-slate-100">
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span className="font-medium mr-2">Créés entre :</span>
        <input 
          type="date" 
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-transparent focus:outline-none font-medium text-slate-800 w-28"
        />
        <span className="mx-2 text-slate-300">→</span>
        <input 
          type="date" 
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-transparent focus:outline-none font-medium text-slate-800 w-28"
        />
      </div>
      <button 
        onClick={applyFilter}
        className="px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
      >
        Appliquer
      </button>
    </div>
  );
}