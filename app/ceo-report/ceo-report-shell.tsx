"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import type { UserRole } from "@/lib/constants";
import { DG_REPORT_NAV_GROUPS } from "./config";

export interface DgReportShellProps {
    user: {
        id?: string;
        email: string
    };
    profile: {
        full_name: string | null;
        role: string;
        avatar_url?: string | null;
    } | null;
    children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "retail_sidebar_dg_report_collapsed";
// Vérifiez que ce chemin correspond exactement à votre arborescence Next.js (/dg-report ou /ceo-report)
const MAIN_PATH = "/ceo-report";

export default function CeoReportShell({
    user,
    profile,
    children,
}: DgReportShellProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [mobileOpen, setMobileOpen] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    // 1. Montage sécurisé sans mismatch d'hydratation
    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (saved !== null) {
                setCollapsed(JSON.parse(saved));
            }
        } catch {
            // Tolérance aux blocages de stockage (mode navigation privée stricte)
        }
    }, []);

    // 2. Fermeture automatique du tiroir mobile lors d'un changement de page
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // 3. Gestion du Thème
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
            // Ignorer si localStorage est inaccessible
        }
    }, []);

    // 4. Accessibilité : Fermeture via touche Échap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && mobileOpen) {
                setMobileOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileOpen]);

    // 5. Blocage du scroll sous-jacent en mode mobile
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    const userRole = (profile?.role as UserRole) ?? "user";

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden antialiased select-none-text">
            {/* Sidebar Bureau (Desktop) */}
            <aside className="hidden md:flex h-full shrink-0 border-r border-border/40">
                <AppSidebar
                    mainPath={MAIN_PATH}
                    groups={DG_REPORT_NAV_GROUPS}
                    role={userRole}
                    collapsed={collapsed}
                    onCollapse={handleCollapse}
                />
            </aside>

            {/* Sidebar Mobile (Drawer animé) */}
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
                    groups={DG_REPORT_NAV_GROUPS}
                />

                <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8 scroll-smooth">
                    <div className="mx-auto max-w-7xl">{children}</div>
                </main>
            </div>
        </div>
    );
}