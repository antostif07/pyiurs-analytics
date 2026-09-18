import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReportPageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    badge?: string;
}

export default function ReportPageHeader({
    title,
    subtitle,
    children,
    badge,
}: ReportPageHeaderProps) {
    return (
        <div className="border-b border-border/60 bg-background px-6 py-4 sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-[16px] font-semibold text-foreground tracking-tight leading-none">
                                {title}
                            </h1>
                            {badge && (
                                <span className="text-[9px] font-bold px-1.5 py-[3px] rounded-md bg-chart-3/15 text-chart-3 border border-chart-3/20 tracking-wider uppercase">
                                    {badge}
                                </span>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-[12px] text-muted-foreground/60 mt-[3px] leading-none">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {children && (
                    <div className="flex items-center gap-2 flex-wrap">{children}</div>
                )}
            </div>
        </div>
    );
}

interface SectionHeaderProps {
    title: string;
    action?: ReactNode;
    className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
    return (
        <div className={cn("flex items-center justify-between mb-3", className)}>
            <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
                {title}
            </h2>
            {action && (
                <div className="text-[11px] text-muted-foreground/60">{action}</div>
            )}
        </div>
    );
}