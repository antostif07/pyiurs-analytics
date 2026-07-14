// src/components/dashboard/KPIDisconnected.tsx
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ODOO_KPIS_QUERY_KEY } from "../../config/dashboard-theme";
import * as React from "react";

export function KPIDisconnected() {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    // Invalide la requête pour forcer un refetch en arrière-plan
    await queryClient.invalidateQueries({ queryKey: ODOO_KPIS_QUERY_KEY });
    setIsRetrying(false);
  }, [queryClient]);

  return (
    <div 
      className="bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3.5 text-amber-600 dark:text-amber-500">
        <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-foreground">
            Liaison Odoo indisponible
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Les indicateurs de l'ERP n'ont pas pu être rafraîchis. L'affichage s'est replié sur les dernières données connues ou des métriques locales.
          </p>
        </div>
      </div>
      
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-white dark:text-amber-400 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
        <span>Réessayer la synchronisation</span>
      </button>
    </div>
  );
}