"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import { INVENTORY_NAV_GROUPS } from "./config";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { UserRole } from "@/lib/constants";

interface InventoryLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "retail_sidebar_inventory_collapsed";

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  // Persistance de l'état de réduction de la sidebar
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Évite les erreurs de réhydratation pour le thème SSR/CSR
  useEffect(() => {
    setMounted(true);
  }, []);

  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = mounted ? resolvedTheme === "dark" : false;

  const handleToggleDark = useCallback(() => {
    setTheme(isDarkMode ? "light" : "dark");
  }, [isDarkMode, setTheme]);

  // Sauvegarde de l'état de la sidebar
  const handleCollapse = useCallback((isCollapsed: boolean) => {
    setCollapsed(isCollapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isCollapsed));
    }
  }, []);

  // Fermeture du menu mobile via la touche Echap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Empêcher le scroll arrière-plan quand le drawer mobile est ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  // Sécurité et Résolution du rôle
  const { profile } = useAuth();
  const userRole = (profile?.role as UserRole) ?? "user";

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden antialiased select-none-text">
      {/* Sidebar Bureau */}
      <aside className="hidden md:flex h-full shrink-0 border-r border-border/40">
        <AppSidebar
          mainPath="/inventory"
          groups={INVENTORY_NAV_GROUPS}
          role={userRole}
          collapsed={collapsed}
          onCollapse={handleCollapse}
        />
      </aside>

      {/* Sidebar Mobile (Tiroir Drawer avec Accessibilité) */}
      <AnimatePresence mode="wait">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation du module stock"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl"
            >
              <AppSidebar
                mainPath="/inventory"
                groups={INVENTORY_NAV_GROUPS}
                role={userRole}
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zone de Contenu Principale */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <AppTopbar
          dark={isDarkMode}
          onToggleDark={handleToggleDark}
          onMenuOpen={() => setMobileOpen(true)}
          groups={INVENTORY_NAV_GROUPS}
        />

        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}