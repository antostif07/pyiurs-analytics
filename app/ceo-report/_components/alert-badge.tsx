import Link from "next/link";
import {
    ChevronRight,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertSeverity } from "../_lib/types/reports";

interface AlertBadgeProps {
    severity: AlertSeverity;
    message: string;
    detail?: string;
    href?: string;
    count?: number;
}

type SeverityStyle = {
    Icon: LucideIcon;
    iconColor: string;
    border: string;
    bg: string;
    title: string;
    badge: string;
    indicator: string;
};

const severityConfig: Record<AlertSeverity, SeverityStyle> = {
    critical: {
        Icon: AlertCircle,
        iconColor: "text-destructive",
        border: "border-destructive/20",
        bg: "bg-destructive/5 hover:bg-destructive/10",
        title: "text-destructive",
        badge: "bg-destructive/15 text-destructive border border-destructive/20",
        indicator: "bg-destructive",
    },
    warning: {
        Icon: AlertTriangle,
        iconColor: "text-chart-3",
        border: "border-chart-3/20",
        bg: "bg-chart-3/5 hover:bg-chart-3/10",
        title: "text-chart-3",
        badge: "bg-chart-3/15 text-chart-3 border border-chart-3/20",
        indicator: "bg-chart-3",
    },
    info: {
        Icon: CheckCircle,
        iconColor: "text-chart-2",
        border: "border-chart-2/20",
        bg: "bg-chart-2/5 hover:bg-chart-2/10",
        title: "text-chart-2",
        badge: "bg-chart-2/15 text-chart-2 border border-chart-2/20",
        indicator: "bg-chart-2",
    },
};

export default function AlertBadge({
    severity,
    message,
    detail,
    href,
    count,
}: AlertBadgeProps) {
    const cfg = severityConfig[severity];
    const { Icon } = cfg;

    const containerClass = cn(
        "flex items-start gap-3 px-3.5 py-3 rounded-xl border text-[12px] transition-all duration-150",
        cfg.bg,
        cfg.border,
        href && "cursor-pointer"
    );

    const content = (
        <>
            <Icon size={13} className={cn("mt-px shrink-0", cfg.iconColor)} />
            <div className="flex-1 min-w-0">
                <span className={cn("font-semibold block leading-tight", cfg.title)}>
                    {message}
                </span>
                {detail && (
                    <p className="text-muted-foreground/60 mt-1 text-[11px] leading-relaxed">
                        {detail}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {count !== undefined && (
                    <span
                        className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums",
                            cfg.badge
                        )}
                    >
                        {count}
                    </span>
                )}
                {href && (
                    <ChevronRight size={12} className="text-muted-foreground/30" />
                )}
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={containerClass}>
                {content}
            </Link>
        );
    }

    return <div className={containerClass}>{content}</div>;
}