// app/revenue/revenue-shell.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import type { UserRole } from "@/lib/constants";
import { NAV_GROUPS } from "./config";

export interface RevenueShellProps {
    /** Rôle narrowé côté serveur (RevenueRole | "controller") */
    role: UserRole;
    children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "retail_sidebar_revenue_collapsed";
const MAIN_PATH = "/revenue";

export default function RevenueShell({ role, children }: RevenueShellProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [mobileOpen, setMobileOpen] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // 1. Hydratation sécurisée (localStorage après mount)
    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (saved !== null) setCollapsed(JSON.parse(saved));
        } catch {
            /* storage unavailable */
        }
    }, []);

    // 2. Fermeture auto du drawer mobile à chaque navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // 3. Thème — next-themes (monté au Root Layout)
    const { resolvedTheme, setTheme } = useTheme();
    const isDarkMode = mounted ? resolvedTheme === "dark" : false;

    const handleToggleDark = useCallback(() => {
        setTheme(isDarkMode ? "light" : "dark");
    }, [isDarkMode, setTheme]);

    const handleCollapse = useCallback((isCollapsed: boolean) => {
        setCollapsed(isCollapsed);
        try {
            localStorage.setItem(
                SIDEBAR_STORAGE_KEY,
                JSON.stringify(isCollapsed),
            );
        } catch {
            /* ignore */
        }
    }, []);

    // 4. Fermeture via Échap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileOpen]);

    // 5. Blocage du scroll body en mode mobile drawer
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden antialiased">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex h-full shrink-0 border-r border-border/40">
                <AppSidebar
                    mainPath={MAIN_PATH}
                    groups={NAV_GROUPS}
                    role={role}
                    collapsed={collapsed}
                    onCollapse={handleCollapse}
                />
            </aside>

            {/* Sidebar Mobile (Drawer) */}
            <AnimatePresence mode="wait">
                {mobileOpen && (
                    <div
                        className="fixed inset-0 z-50 md:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation Revenue"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setMobileOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                            }}
                            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl"
                        >
                            <AppSidebar
                                mainPath={MAIN_PATH}
                                groups={NAV_GROUPS}
                                role={role}
                                collapsed={false}
                                onCollapse={() => setMobileOpen(false)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Zone Contenu */}
            <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
                <AppTopbar
                    dark={isDarkMode}
                    onToggleDark={handleToggleDark}
                    onMenuOpen={() => setMobileOpen(true)}
                    groups={NAV_GROUPS}
                />
                <main className="flex-1 overflow-y-auto bg-background/50 scroll-smooth">
                    <div className="mx-auto max-w-[1600px]">{children}</div>
                </main>
            </div>
        </div>
    );
}