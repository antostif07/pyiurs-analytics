// app/ceo-report/_components/ceo-kpi-card.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CeoKpiCardProps {
    label: string;
    value: string | number;
    subtitle?: React.ReactNode;
    icon: React.ReactNode;
    iconColor?: string;     // ex: "text-indigo-600"
    iconBg?: string;        // ex: "bg-indigo-50 dark:bg-indigo-950/50"
    valueColor?: string;    // ex: "text-rose-600"
    isLoading?: boolean;
    className?: string;
}

export default function CeoKpiCard({
    label,
    value,
    subtitle,
    icon,
    iconColor = "text-indigo-600",
    iconBg = "bg-indigo-50 dark:bg-indigo-950/50",
    valueColor = "text-slate-900 dark:text-white",
    isLoading = false,
    className,
}: CeoKpiCardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs transition-all",
                className
            )}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate pr-2">
                    {label}
                </span>
                <div className={cn("p-1.5 rounded-lg shrink-0", iconBg, iconColor)}>
                    {icon}
                </div>
            </div>

            <div className="mt-2 min-h-[28px] flex items-center">
                {isLoading ? (
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                ) : (
                    <div className={cn("text-xl font-bold font-mono tracking-tight", valueColor)}>
                        {value}
                    </div>
                )}
            </div>

            <div className="mt-0.5 min-h-[16px]">
                {isLoading ? (
                    <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse mt-1" />
                ) : (
                    subtitle && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}