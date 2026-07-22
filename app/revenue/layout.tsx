'use client';

import { useState } from "react";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import { NAV_GROUPS } from "./config";
import { AnimatePresence, motion } from "framer-motion";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { UserRole } from "@/lib/constants";

export default function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const handleToggleDark = () => setTheme(isDarkMode ? "light" : "dark");

  const { profile } = useAuth();
  const userRole = (profile?.role as UserRole) ?? "user";

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-150">

      {/* Sidebar Bureau */}
      <div className="hidden md:flex h-full">
        <AppSidebar
          role={userRole} // ✅ Injecté dynamiquement
          collapsed={collapsed}
          onCollapse={setCollapsed}
          groups={NAV_GROUPS}
          mainPath={"/revenue"}
        />
      </div>

      {/* Sidebar Mobile Tiroir (Drawer) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Arrière-plan flouté interactif pour fermeture */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            {/* Conteneur coulissant */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden"
            >
              <AppSidebar
                groups={NAV_GROUPS}
                mainPath="/revenue"
                role={userRole} // ✅ Injecté dynamiquement
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Conteneur principal de droite */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar
          dark={isDarkMode}
          onToggleDark={handleToggleDark}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-background p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}