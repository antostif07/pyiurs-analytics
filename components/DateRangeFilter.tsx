"use client";

import * as React from "react";
import { format, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const defaultFrom = searchParams.get("from") || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultTo = searchParams.get("to") || format(new Date(), "yyyy-MM-dd");

  const [from, setFrom] = React.useState(defaultFrom);
  const [to, setTo] = React.useState(defaultTo);

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
      
      {/* Zone Inputs Dates */}
      <div className="flex flex-col sm:flex-row items-center px-3 py-2 text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-100 w-full sm:w-auto">
        
        {/* Label (Caché sur très petit écran si besoin, ou ajusté) */}
        <div className="flex items-center mb-2 sm:mb-0 sm:mr-2 w-full sm:w-auto">
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
            <span className="font-medium whitespace-nowrap">Créés entre :</span>
        </div>

        {/* Inputs Container */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <input 
              type="date" 
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-white sm:bg-transparent border sm:border-none border-slate-200 rounded px-2 py-1 sm:p-0 focus:outline-none font-medium text-slate-800 w-full sm:w-auto text-center sm:text-left shadow-sm sm:shadow-none"
            />
            
            <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
            
            <input 
              type="date" 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-white sm:bg-transparent border sm:border-none border-slate-200 rounded px-2 py-1 sm:p-0 focus:outline-none font-medium text-slate-800 w-full sm:w-auto text-center sm:text-left shadow-sm sm:shadow-none"
            />
        </div>
      </div>

      {/* Bouton Appliquer */}
      <button 
        onClick={applyFilter}
        className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors flex justify-center items-center shadow-sm"
      >
        Appliquer
      </button>
    </div>
  );
}