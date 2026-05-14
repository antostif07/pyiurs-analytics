"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import ReportTopbar from "@/components/new-ui/layout/app-topbar";
import { NAV_GROUPS } from "./config";
import { useTheme } from "next-themes"; // Mieux que le state local
import { useAuth } from "@/contexts/AuthContext";

export default function HRLayout({ 
  children,
}: { 
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const filteredNavGroups = useMemo(() => {
    if (!profile?.role) return [];
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        !item.roles || item.roles.includes(profile.role as any)
      ),
    })).filter((group) => group.items.length > 0);
  }, [profile?.role]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar - Isolation via memo pour éviter les re-renders inutiles */}
      <aside className="hidden md:flex h-full border-r border-border/40 shadow-sm">
        <AppSidebar
          mainPath="/hr"
          groups={filteredNavGroups}
          role={profile?.role as any}
          collapsed={collapsed}
          onCollapse={setCollapsed}
        />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <ReportTopbar
          dark={theme === "dark"}
          onToggleDark={() => setTheme(theme === "dark" ? "light" : "dark")}
          onMenuOpen={() => setMobileOpen(true)}
          // Ajout : Fil d'ariane automatique basé sur la route
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 scroll-smooth">
          {/* Transition fluide entre les pages RH */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-[1400px] mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Drawer (Optimisé pour Touch) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-card shadow-2xl md:hidden"
            >
              <AppSidebar
                groups={filteredNavGroups}
                mainPath="/hr"
                role={profile?.role as any}
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}