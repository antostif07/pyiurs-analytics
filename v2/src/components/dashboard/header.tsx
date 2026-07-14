// src/components/dashboard/Header.tsx
import { BarChart3, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ODOO_KPIS_QUERY_KEY, type OdooKPIsResult } from "../../config/dashboard-theme";
import { ThemeSwitcher } from "../theme-switcher";
import { UserDropdown } from "./user-dropdown";

export function Header() {
  // Lecture passive depuis le cache global sans déclencher d'appel réseau (4.1)
  const { data: odooData } = useQuery<OdooKPIsResult>({
    queryKey: ODOO_KPIS_QUERY_KEY,
    enabled: false,
  });

  const isConnected = odooData?.success === true;

  return (
    <header className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between bg-card/65 backdrop-blur-sm sticky top-0 z-50">
      {/* Zone de marque */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/10">
          <BarChart3 className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <span className="font-bold text-base sm:text-lg tracking-tight text-foreground">
          Pyiurs <span className="text-primary">Analytics</span>
        </span>
      </div>

      {/* Commandes du tableau de bord */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Témoin d'état de la synchronisation de l'ERP Odoo (4.1) */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
            isConnected 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
          }`}
          title={isConnected ? "ERP Odoo Synchronisé" : "Liaison ERP Interrompue"}
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="hidden xs:inline">{isConnected ? "Odoo Ok" : "Odoo Offline"}</span>
        </div>

        <span className="h-5 w-[1px] bg-border/40" aria-hidden="true" />
        <ThemeSwitcher />
        <span className="h-5 w-[1px] bg-border/40" aria-hidden="true" />
        <UserDropdown />
      </div>
    </header>
  );
}