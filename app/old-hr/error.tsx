// app/hr/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function HRError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ici, on enverrait l'erreur à Sentry ou Logtail
    console.error("Global HR Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <div className="p-4 bg-rose-50 rounded-full text-rose-600">
        <AlertTriangle size={48} />
      </div>
      
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Une erreur est survenue</h2>
        <p className="text-slate-500">
          Le module RH n'a pas pu charger correctement cette section. 
          L'incident a été enregistré pour analyse.
        </p>
      </div>

      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => window.location.href = "/"}
          className="rounded-xl"
        >
          Retour à l'accueil
        </Button>
        <Button 
          onClick={() => reset()}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex gap-2"
        >
          <RefreshCcw size={16} /> Réessayer
        </Button>
      </div>
      
      <p className="text-[10px] text-slate-400 font-mono">ID Erreur: {error.digest || 'N/A'}</p>
    </div>
  );
}