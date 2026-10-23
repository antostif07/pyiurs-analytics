// app/revenue/arpu/_components/insight-card.tsx
"use client";

import { cn } from "@/lib/utils";

type InsightType = "positive" | "warning";

const STYLES: Record<InsightType, string> = {
    positive:
        "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400",
    warning:
        "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60 text-amber-800 dark:text-amber-400",
};

export default function InsightCard({
    type,
    text,
}: {
    type: InsightType;
    text: string;
}) {
    return (
        <div
            className={cn(
                "rounded-lg border px-3 py-2 text-[11px] leading-relaxed",
                STYLES[type],
            )}
        >
            {text}
        </div>
    );
}