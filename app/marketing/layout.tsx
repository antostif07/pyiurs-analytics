"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReportSidebar from "@/components/new-ui/layout/app-sidebar";
import ReportTopbar from "@/components/new-ui/layout/app-topbar";
import { MARKETING_NAV_GROUPS } from "./config";

type Role = "admin" | "manager" | "staff";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role: Role = "admin";

  const handleToggleDark = () => {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <ReportSidebar
          mainPath="/marketing"
          groups={MARKETING_NAV_GROUPS}
          role={role}
          collapsed={collapsed}
          onCollapse={setCollapsed}
        />
      </div>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden"
            >
              <ReportSidebar
                groups={MARKETING_NAV_GROUPS}
                mainPath="/marketing"
                role={role}
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ReportTopbar
          dark={dark}
          onToggleDark={handleToggleDark}
          onMenuOpen={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}