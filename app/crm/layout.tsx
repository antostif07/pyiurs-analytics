"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar from "../../components/new-ui/layout/app-sidebar";
import ReportTopbar from "../../components/new-ui/layout/app-topbar";
import { CRM_NAV_GROUPS } from "./config";

type Role = "Admin" | "Manager" | "Staff";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role: Role = "Admin";

  const handleToggleDark = () => {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <AppSidebar
          mainPath="/crm"
          groups={CRM_NAV_GROUPS}
          role={role}
          collapsed={collapsed}
          onCollapse={setCollapsed}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden"
            >
              <AppSidebar
                groups={CRM_NAV_GROUPS}
                mainPath="/crm"
                role={role}
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right side: topbar + content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ReportTopbar
          dark={dark}
          onToggleDark={handleToggleDark}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-background p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
