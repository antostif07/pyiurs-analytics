"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import type { ControlsRole } from "@/lib/auth/roles";
import { NAV_GROUPS } from "./config";

export interface ControlsShellProps {
    role: ControlsRole;
    children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "retail_sidebar_controls_collapsed";
const MAIN_PATH = "/controls";

export default function ControlsShell({ role, children }: ControlsShellProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            if (saved !== null) setCollapsed(JSON.parse(saved));
        } catch {
            /* storage unavailable */
        }
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileOpen]);

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

            {/* Sidebar Mobile (Drawer léger CSS) */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 md:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigation Contrôles"
                >
                    <div
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
                        <AppSidebar
                            mainPath={MAIN_PATH}
                            groups={NAV_GROUPS}
                            role={role}
                            collapsed={false}
                            onCollapse={() => setMobileOpen(false)}
                        />
                    </div>
                </div>
            )}

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