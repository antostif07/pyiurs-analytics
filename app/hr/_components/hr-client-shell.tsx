"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import ReportTopbar from "@/components/new-ui/layout/app-topbar";
import { NAV_GROUPS } from "@/app/hr/config";
import { UserRole } from "@/lib/constants";

// 1. Interface nettoyée (filteredNavGroups a été retiré des props requises)
interface HRClientShellProps {
    children: React.ReactNode;
    initialCollapsed: boolean;
    userRole: string;
    userProfile: {
        fullName: string;
        email: string;
        avatarUrl?: string;
    };
}

export function HRClientShell({
    children,
    initialCollapsed,
    userRole,
    userProfile,
}: HRClientShellProps) {
    const pathname = usePathname();
    const { theme, setTheme, resolvedTheme } = useTheme();

    const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fermeture automatique du tiroir mobile lors d'un changement de page
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Persistance du collapse de la sidebar dans un cookie pour le serveur
    const handleCollapse = useCallback((value: boolean | ((prevState: boolean) => boolean)) => {
        setCollapsed((prev) => {
            const nextValue = typeof value === "function" ? value(prev) : value;
            document.cookie = `hr_sidebar_collapsed=${nextValue}; path=/; max-age=31536000; SameSite=Lax`;
            return nextValue;
        });
    }, []);

    // 2. Le filtrage des menus est calculé ici côté client à partir du userRole
    const filteredNavGroups = useMemo(() => {
        if (!userRole) return [];
        return NAV_GROUPS.map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (!item.roles || item.roles.length === 0) return true;
                return item.roles.includes(userRole as UserRole);
            }),
        })).filter((group) => group.items.length > 0);
    }, [userRole]);

    // Verrouillage du défilement tactile quand le tiroir mobile est ouvert
    useEffect(() => {
        if (!mobileOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMobileOpen(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileOpen]);

    const isDarkMode = mounted ? (resolvedTheme || theme) === "dark" : true;

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar (Rendu stable sans saut visuel) */}
            <aside
                aria-label="Navigation Principale RH"
                className="hidden md:flex h-full border-r border-border/40 bg-card/50 backdrop-blur-md select-none z-30"
            >
                <AppSidebar
                    mainPath="/hr"
                    groups={filteredNavGroups}
                    role={userRole as any}
                    collapsed={collapsed}
                    onCollapse={handleCollapse}
                />
            </aside>

            {/* Conteneur Principal */}
            <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
                <ReportTopbar
                    dark={isDarkMode}
                    onToggleDark={() => setTheme(isDarkMode ? "light" : "dark")}
                    onMenuOpen={() => setMobileOpen(true)}
                />

                <main
                    id="main-hr-viewport"
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 scroll-smooth focus:outline-none"
                    tabIndex={-1}
                >
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Tiroir Mobile (Drawer) */}
            <AnimatePresence mode="wait">
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setMobileOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            aria-hidden="true"
                        />

                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 280 }}
                            className="absolute left-0 top-0 bottom-0 w-[290px] max-w-[85vw] bg-card border-r border-border/40 shadow-2xl flex flex-col z-10"
                        >
                            <AppSidebar
                                mainPath="/hr"
                                groups={filteredNavGroups}
                                role={userRole as any}
                                collapsed={false}
                                onCollapse={() => setMobileOpen(false)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}