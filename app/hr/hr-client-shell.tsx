"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import AppSidebar from "@/components/new-ui/layout/app-sidebar";
import AppTopbar from "@/components/new-ui/layout/app-topbar";
import type { HrRole } from "@/lib/auth/hr-roles";
import type { UserRole } from "@/lib/constants";
import { NAV_GROUPS } from "@/app/hr/config";

interface HRClientShellProps {
    children: React.ReactNode;
    initialCollapsed: boolean;
    userRole: HrRole;
}

const MAIN_PATH = "/hr";

export function HRClientShell({
    children,
    initialCollapsed,
    userRole,
}: HRClientShellProps) {
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();

    const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const handleCollapse = useCallback((nextValue: boolean) => {
        setCollapsed(nextValue);
        document.cookie = `hr_sidebar_collapsed=${nextValue}; path=/; max-age=31536000; SameSite=Lax`;
    }, []);

    const filteredNavGroups = useMemo(() => {
        return NAV_GROUPS.map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (!item.roles || item.roles.length === 0) return true;
                return item.roles.includes(userRole as UserRole);
            }),
        })).filter((group) => group.items.length > 0);
    }, [userRole]);

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

    const isDarkMode = mounted ? resolvedTheme === "dark" : false;

    const handleToggleDark = useCallback(() => {
        setTheme(isDarkMode ? "light" : "dark");
    }, [isDarkMode, setTheme]);

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden antialiased">
            <aside
                aria-label="Navigation Principale RH"
                className="hidden md:flex h-full shrink-0 border-r border-border/40"
            >
                <AppSidebar
                    mainPath={MAIN_PATH}
                    groups={filteredNavGroups}
                    role={userRole}
                    collapsed={collapsed}
                    onCollapse={handleCollapse}
                />
            </aside>

            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 md:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigation RH"
                >
                    <div
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                        aria-hidden="true"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl animate-in slide-in-from-left duration-200">
                        <AppSidebar
                            mainPath={MAIN_PATH}
                            groups={filteredNavGroups}
                            role={userRole}
                            collapsed={false}
                            onCollapse={() => setMobileOpen(false)}
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
                <AppTopbar
                    dark={isDarkMode}
                    onToggleDark={handleToggleDark}
                    onMenuOpen={() => setMobileOpen(true)}
                    groups={filteredNavGroups}
                />
                <main
                    id="main-hr-viewport"
                    className="flex-1 overflow-y-auto bg-background/50 scroll-smooth focus:outline-none"
                    tabIndex={-1}
                >
                    <div className="mx-auto max-w-[1600px]">{children}</div>
                </main>
            </div>
        </div>
    );
}