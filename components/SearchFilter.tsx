"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
// import { useDebounce } from "use-debounce";

export default function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // On initialise avec la valeur de l'URL
  const initialQuery = searchParams.get("q") || "";
  const [text, setText] = useState(initialQuery);
  
  // Debounce manuel (500ms) pour éviter de spammer le serveur
  useEffect(() => {
    const timer = setTimeout(() => {
      // On ne met à jour l'URL que si le texte a changé par rapport à l'URL actuelle
      if (text !== searchParams.get("q")) {
        const params = new URLSearchParams(searchParams.toString());
        if (text) {
          params.set("q", text);
        } else {
          params.delete("q");
        }
        router.push(`?${params.toString()}`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [text, router, searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Filtrer par HS Code ou Réf..."
        className="pl-9 pr-8 py-1.5 w-64 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
      />
      {text && (
        <button 
          onClick={() => setText("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}