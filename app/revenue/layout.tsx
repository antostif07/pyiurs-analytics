'use client';

import { useState } from "react";
import { Menu, Bell, Search } from "lucide-react";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import { NAV_GROUPS } from "./config";
import { AnimatePresence, motion } from "framer-motion";
import AppTopbar from "@/components/new-ui/layout/app-topbar";

export default function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const handleToggleDark = () => {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex h-full">
        <AppSidebar
          role={"admin"}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          groups={NAV_GROUPS}
          mainPath={"/revenue"}        
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
                groups={NAV_GROUPS}
                mainPath="/revenue"
                role={"admin"}
                collapsed={false}
                onCollapse={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
        

      {/* Right side: topbar + content */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <AppTopbar
                dark={dark}
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