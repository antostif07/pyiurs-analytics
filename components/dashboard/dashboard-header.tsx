import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface DashboardHeaderProps {
  user: User;
  profile: Partial<Profile> | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
}

export const DashboardHeader = ({
  user,
  profile,
  darkMode,
  onToggleDarkMode,
  onSignOut
}: DashboardHeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">

          {/* Logo et Rôle Badge */}
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold tracking-tight">Pyiurs Dashboard</h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              {profile?.role?.toUpperCase() || 'USER'}
            </span>
          </div>

          {/* Menu d'actions Bureau */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-muted-foreground hover:bg-muted/40 rounded-full transition-colors cursor-pointer"
              aria-label="Basculer le mode sombre"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="flex items-center space-x-3 border-l border-border pl-4">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold">{profile?.full_name || 'Utilisateur'}</span>
                <span className="text-[10px] text-muted-foreground font-light">{user.email}</span>
              </div>

              {/* Avatar Minimaliste Luxe */}
              <div className="h-9 w-9 bg-foreground text-background dark:bg-foreground dark:text-background rounded-full flex items-center justify-center font-medium shadow-sm border border-border">
                {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>

              <button
                onClick={onSignOut}
                className="ml-1 p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Actions Mobiles */}
          <div className="md:hidden flex items-center space-x-1">
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-muted-foreground"
              aria-label="Basculer le mode sombre"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-muted-foreground"
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Tiroir de navigation mobile ultra-fluide */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card text-card-foreground p-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 border-b border-border pb-3">
              <div className="h-10 w-10 bg-foreground text-background rounded-full flex items-center justify-center font-semibold">
                {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{profile?.full_name || 'Utilisateur'}</span>
                <span className="text-xs text-muted-foreground font-light">{user.email}</span>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="w-full h-11 flex justify-center items-center rounded-xl text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 transition-all"
            >
              <LogOut size={16} className="mr-2" />
              Se déconnecter de la session
            </button>
          </div>
        </div>
      )}
    </header>
  );
};