// app/ceo-report/ceo-report-shell.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import type { ExecutiveRole } from "@/lib/auth/roles";
import type { UserScope } from "@/lib/auth/scope";
import { DG_REPORT_NAV_GROUPS } from "./config";

export interface CeoReportShellProps {
    /** Rôle exécutif narrowé — seule info de profil dont le Shell a besoin (Sidebar) */
    role: ExecutiveRole;
    /**
     * Scope utilisateur — consommé en V2 (badge Topbar "Vue : Groupe / X boutiques",
     * RLS côté Server Actions). En V1 admin group-wide = { accessType: 'all' }.
     */
    scope: UserScope;
    children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "retail_sidebar_dg_report_collapsed";
const MAIN_PATH = "/ceo-report";

export default function CeoReportShell({
    role,
    scope,
    children,
}: CeoReportShellProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [mobileOpen, setMobileOpen] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // 1. Hydratation sécurisée (évite les mismatch SSR/client sur localStorage)
    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (saved !== null) setCollapsed(JSON.parse(saved));
        } catch {
            /* storage unavailable (private mode, etc.) */
        }
    }, []);

    // 2. Fermeture du drawer mobile à chaque navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // 3. Thème
    const { resolvedTheme, setTheme } = useTheme();
    const isDarkMode = mounted ? resolvedTheme === "dark" : false;

    const handleToggleDark = useCallback(() => {
        setTheme(isDarkMode ? "light" : "dark");
    }, [isDarkMode, setTheme]);

    const handleCollapse = useCallback((isCollapsed: boolean) => {
        setCollapsed(isCollapsed);
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isCollapsed));
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

    // Note : `scope` est volontairement conservé dans les props pour la V2
    // (badge Topbar + RLS côté Server Actions). En V1 admin → { accessType: 'all' }.
    void scope;

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden antialiased">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex h-full shrink-0 border-r border-border/40">
                <AppSidebar
                    mainPath={MAIN_PATH}
                    groups={DG_REPORT_NAV_GROUPS}
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
                        aria-label="Navigation du rapport DG"
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
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl"
                        >
                            <AppSidebar
                                mainPath={MAIN_PATH}
                                groups={DG_REPORT_NAV_GROUPS}
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
                    groups={DG_REPORT_NAV_GROUPS}
                />
                <main className="flex-1 overflow-y-auto bg-background scroll-smooth">
                    <div className="mx-auto max-w-7xl">{children}</div>
                </main>
            </div>
        </div>
    );
}