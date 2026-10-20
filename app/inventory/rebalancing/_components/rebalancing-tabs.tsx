// app/inventory/rebalancing/_components/rebalancing-tabs.tsx
"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import RebalancingTable from "./rebalancing-table";
import type { RebalancingRow, RebalancingSource } from "../_lib/types";

interface Props {
    rows: RebalancingRow[];
}

interface SourceGroup {
    locationId: number;
    label: string;
    completeName: string | null;
    companyName: string;
    shopName: string | null;
    totalAvailable: number;
    rows: RebalancingRow[];
}

type TabKey = "all" | "no-source" | `loc:${number}`;

export default function RebalancingTabs({ rows }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>("all");

    /* ─── Groupement par source PRIORITAIRE ──────────────────── */
    const grouped = useMemo(() => {
        const bySource = new Map<number, SourceGroup>();
        const withoutSource: RebalancingRow[] = [];

        for (const row of rows) {
            if (row.sources.length === 0) {
                withoutSource.push(row);
                continue;
            }

            // Sources triées côté backend : configured + qty desc
            // → la première est notre source prioritaire
            const primary: RebalancingSource = row.sources[0];

            const existing = bySource.get(primary.locationId);
            if (existing) {
                existing.rows.push(row);
                existing.totalAvailable += primary.quantity;
            } else {
                bySource.set(primary.locationId, {
                    locationId: primary.locationId,
                    label:
                        primary.shopName ??
                        primary.locationCompleteName ??
                        primary.locationName,
                    completeName: primary.locationCompleteName,
                    companyName: primary.companyName,
                    shopName: primary.shopName,
                    totalAvailable: primary.quantity,
                    rows: [row],
                });
            }
        }

        const sources = Array.from(bySource.values()).sort(
            (a, b) => b.rows.length - a.rows.length,
        );

        return { sources, withoutSource };
    }, [rows]);

    const withSource = useMemo(
        () => rows.filter((r) => r.sources.length > 0),
        [rows],
    );

    /* ─── Rows filtrées selon le tab actif ───────────────────── */
    const filteredRows = useMemo(() => {
        if (activeTab === "all") return withSource;
        if (activeTab === "no-source") return grouped.withoutSource;
        const locId = Number(activeTab.replace("loc:", ""));
        const group = grouped.sources.find((g) => g.locationId === locId);
        return group?.rows ?? [];
    }, [activeTab, withSource, grouped]);

    /* ─── Rendu ──────────────────────────────────────────────── */
    return (
        <div className="space-y-3">
            {/* Tab bar */}
            <div className="flex flex-wrap items-center gap-1 border-b border-border/60 pb-2">
                <TabButton
                    active={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                    icon={<Scale className="w-3 h-3" />}
                    label="Toutes les sources"
                    count={withSource.length}
                    tone="violet"
                />

                {grouped.sources.map((group) => (
                    <TabButton
                        key={group.locationId}
                        active={activeTab === `loc:${group.locationId}`}
                        onClick={() =>
                            setActiveTab(`loc:${group.locationId}`)
                        }
                        label={group.label}
                        sublabel={group.companyName}
                        count={group.rows.length}
                        tone="emerald"
                        title={
                            group.completeName
                                ? `${group.completeName} · ${group.totalAvailable} pcs dispo`
                                : undefined
                        }
                    />
                ))}

                {grouped.withoutSource.length > 0 && (
                    <TabButton
                        active={activeTab === "no-source"}
                        onClick={() => setActiveTab("no-source")}
                        icon={
                            <AlertCircle className="w-3 h-3" />
                        }
                        label="Sans source"
                        count={grouped.withoutSource.length}
                        tone="rose"
                    />
                )}
            </div>

            {/* Table filtrée */}
            {filteredRows.length === 0 ? (
                <EmptyTabContent
                    activeTab={activeTab}
                    groupedSourcesCount={grouped.sources.length}
                />
            ) : (
                <RebalancingTable rows={filteredRows} />
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════ */
/* TAB BUTTON                                                       */
/* ══════════════════════════════════════════════════════════════════ */

type TabTone = "violet" | "emerald" | "rose";

const TONE_ACTIVE: Record<TabTone, string> = {
    violet:
        "border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    emerald:
        "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    rose:
        "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
};

const TONE_COUNT_ACTIVE: Record<TabTone, string> = {
    violet: "bg-violet-600 text-white",
    emerald: "bg-emerald-600 text-white",
    rose: "bg-rose-600 text-white",
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    sublabel?: string;
    count: number;
    tone: TabTone;
    icon?: React.ReactNode;
    title?: string;
}

function TabButton({
    active,
    onClick,
    label,
    sublabel,
    count,
    tone,
    icon,
    title,
}: TabButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors max-w-[220px]",
                active
                    ? TONE_ACTIVE[tone]
                    : "border-border/60 text-muted-foreground hover:bg-accent/40",
            )}
        >
            {icon}
            <div className="flex flex-col items-start leading-tight min-w-0">
                <span className="truncate max-w-[160px]">{label}</span>
                {sublabel && (
                    <span
                        className={cn(
                            "text-[9px] font-normal truncate max-w-[160px]",
                            active
                                ? "opacity-80"
                                : "text-muted-foreground/60",
                        )}
                    >
                        {sublabel}
                    </span>
                )}
            </div>
            <span
                className={cn(
                    "ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums shrink-0",
                    active
                        ? TONE_COUNT_ACTIVE[tone]
                        : "bg-muted/60 text-muted-foreground",
                )}
            >
                {count}
            </span>
        </button>
    );
}

/* ══════════════════════════════════════════════════════════════════ */
/* EMPTY STATE                                                       */
/* ══════════════════════════════════════════════════════════════════ */

function EmptyTabContent({
    activeTab,
    groupedSourcesCount,
}: {
    activeTab: TabKey;
    groupedSourcesCount: number;
}) {
    if (activeTab === "no-source") {
        return (
            <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucun produit sans source détecté.
                </p>
            </div>
        );
    }
    if (activeTab === "all") {
        return (
            <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune source identifiée pour les produits en déficit.
                </p>
            </div>
        );
    }
    if (groupedSourcesCount === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune source disponible.
                </p>
            </div>
        );
    }
    return (
        <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
            <p className="text-[11px] text-muted-foreground/60 italic">
                Aucun produit à traiter depuis cette source.
            </p>
        </div>
    );
}