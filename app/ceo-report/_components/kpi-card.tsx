import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
    label: string;
    value: number | string;
    unit?: string;
    format?: "currency" | "number" | "percent";
    variation?: number;
    variationLabel?: string;
    subLabel?: string;
    href?: string;
    isPositiveUp?: boolean;
    size?: "sm" | "md" | "lg";
    highlight?: boolean;
    accentColor?: "blue" | "emerald" | "amber" | "red" | "violet";
}

function formatValue(value: number | string, format?: string): string {
    if (typeof value === "string") return value;
    if (format === "currency") {
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1).replace(".0", "")}k`;
        return `$${value.toLocaleString("fr-FR")}`;
    }
    if (format === "percent") return `${value.toFixed(1)}%`;
    if (format === "number") return value.toLocaleString("fr-FR");
    return String(value);
}

/* Palette alignée sur le thème (--chart-* + --destructive) */
const ACCENT: Record<
    NonNullable<KpiCardProps["accentColor"]>,
    { border: string; bg: string; text: string; via: string }
> = {
    blue: { border: "border-chart-4/20", bg: "bg-chart-4/10", text: "text-chart-4", via: "via-chart-4/50" },
    emerald: { border: "border-chart-2/20", bg: "bg-chart-2/10", text: "text-chart-2", via: "via-chart-2/50" },
    amber: { border: "border-chart-3/20", bg: "bg-chart-3/10", text: "text-chart-3", via: "via-chart-3/50" },
    red: { border: "border-destructive/20", bg: "bg-destructive/10", text: "text-destructive", via: "via-destructive/50" },
    violet: { border: "border-chart-1/20", bg: "bg-chart-1/10", text: "text-chart-1", via: "via-chart-1/50" },
};

export default function KpiCard({
    label,
    value,
    format,
    variation,
    variationLabel,
    subLabel,
    href,
    isPositiveUp = true,
    size = "md",
    highlight = false,
    accentColor,
}: KpiCardProps) {
    const isClickable = !!href;

    const isUp = variation !== undefined && variation > 0;
    const isDown = variation !== undefined && variation < 0;
    const isPositive = isUp === isPositiveUp;

    const trendColor =
        variation === undefined || variation === 0
            ? "text-muted-foreground"
            : isPositive
                ? "text-chart-2"
                : "text-destructive";

    const trendBg =
        variation === undefined || variation === 0
            ? ""
            : isPositive
                ? "bg-chart-2/10"
                : "bg-destructive/10";

    const TrendIcon =
        variation === undefined || variation === 0
            ? Minus
            : isUp
                ? TrendingUp
                : TrendingDown;

    const accent = accentColor ? ACCENT[accentColor] : null;

    const cardClass = cn(
        "relative rounded-xl border bg-card overflow-hidden flex flex-col gap-3 transition-all duration-200",
        size === "sm" && "p-3.5",
        size === "md" && "p-4",
        size === "lg" && "p-5",
        isClickable &&
        "cursor-pointer hover:border-border/80 hover:-translate-y-px hover:shadow-md hover:shadow-foreground/[0.04]",
        highlight && !accent && "border-primary/30 bg-primary/5",
        accent && cn(accent.border, accent.bg)
    );

    const content = (
        <>
            {/* Ligne d'accent en haut */}
            {highlight && !accent && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            )}
            {accent && (
                <div
                    className={cn(
                        "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent",
                        accent.via
                    )}
                />
            )}

            {/* Label */}
            <span
                className={cn(
                    "text-[10.5px] font-semibold uppercase tracking-[0.09em] leading-none",
                    accent ? accent.text : "text-muted-foreground/70"
                )}
            >
                {label}
            </span>

            {/* Value */}
            <div
                className={cn(
                    "font-bold text-foreground leading-none tabular-nums tracking-tight",
                    size === "sm" && "text-xl",
                    size === "md" && "text-[1.6rem]",
                    size === "lg" && "text-4xl",
                    highlight && !accent && "text-primary"
                )}
            >
                {formatValue(value, format)}
            </div>

            {/* Trend */}
            {(variation !== undefined || subLabel) && (
                <div className="flex items-center gap-1.5">
                    {variation !== undefined && (
                        <span
                            className={cn(
                                "flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-1.5 py-0.5",
                                trendColor,
                                trendBg
                            )}
                        >
                            <TrendIcon size={10} strokeWidth={2.5} />
                            {isUp ? "+" : ""}
                            {variation.toFixed(1)}%
                        </span>
                    )}
                    {variationLabel && (
                        <span className="text-[10.5px] text-muted-foreground/60">
                            {variationLabel}
                        </span>
                    )}
                    {subLabel && !variationLabel && (
                        <span className="text-[10.5px] text-muted-foreground/60">
                            {subLabel}
                        </span>
                    )}
                </div>
            )}
        </>
    );

    if (isClickable) {
        return (
            <Link href={href!} className={cardClass} aria-label={label}>
                {content}
            </Link>
        );
    }

    return <div className={cardClass}>{content}</div>;
}