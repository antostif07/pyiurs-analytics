// app/inventory/purchases/_components/purchases-insights.tsx
"use client";

import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsightType, PurchaseInsight } from "../_lib/types";

const TONE: Record<
    InsightType,
    { box: string; icon: string; Icon: typeof AlertTriangle }
> = {
    critical: {
        box: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/60 text-rose-800 dark:text-rose-200",
        icon: "text-rose-600 dark:text-rose-400",
        Icon: AlertTriangle,
    },
    warning: {
        box: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/60 text-amber-800 dark:text-amber-200",
        icon: "text-amber-600 dark:text-amber-400",
        Icon: AlertTriangle,
    },
    info: {
        box: "bg-sky-50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-800/60 text-sky-800 dark:text-sky-200",
        icon: "text-sky-600 dark:text-sky-400",
        Icon: Info,
    },
};

interface Props {
    insights: PurchaseInsight[];
}

export default function PurchasesInsights({ insights }: Props) {
    if (insights.length === 0) return null;

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-3">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Recommandations logistiques & anomalies
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {insights.map((insight, idx) => {
                    const tone = TONE[insight.type];
                    const Icon = tone.Icon;
                    return (
                        <div
                            key={idx}
                            className={cn(
                                "rounded-md border p-2.5 text-[11px] flex items-start gap-2",
                                tone.box,
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-3.5 h-3.5 shrink-0 mt-0.5",
                                    tone.icon,
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="leading-relaxed">
                                    {insight.message}
                                </p>
                                <button
                                    type="button"
                                    className="mt-1 text-[10px] font-semibold uppercase tracking-wider underline opacity-80 hover:opacity-100"
                                >
                                    {insight.action}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}