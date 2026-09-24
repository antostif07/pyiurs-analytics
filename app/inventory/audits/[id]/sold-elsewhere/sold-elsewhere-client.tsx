"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    FileSpreadsheet,
    Package,
    Building2,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSoldElsewhereExport } from "../../_lib/hooks/useSoldElsewhereExport";
import type {
    SoldElsewhereAnalysis,
    SoldElsewhereGroup,
} from "../../_lib/types";

const formatUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(amount);

interface Props {
    analysis: SoldElsewhereAnalysis;
    auditId: string;
}

export function SoldElsewhereClient({ analysis, auditId }: Props) {
    const { handleExportExcel } = useSoldElsewhereExport(analysis);
    const [filter, setFilter] = useState<
        "all" | "internal_transfer" | "inter_company"
    >("all");

    const filteredGroups = useMemo(() => {
        if (filter === "all") return analysis.groups;
        return analysis.groups.filter((g) => g.action === filter);
    }, [analysis.groups, filter]);

    const stats = useMemo(() => {
        const internal = analysis.groups.filter(
            (g) => g.action === "internal_transfer"
        );
        const interCo = analysis.groups.filter(
            (g) => g.action === "inter_company"
        );
        return {
            internalLines: internal.reduce((s, g) => s + g.lines.length, 0),
            internalValue: internal.reduce((s, g) => s + g.totalValue, 0),
            interCoLines: interCo.reduce((s, g) => s + g.lines.length, 0),
            interCoValue: interCo.reduce((s, g) => s + g.totalValue, 0),
            interCoCompanies: interCo.length,
        };
    }, [analysis.groups]);

    if (analysis.totalLines === 0) {
        return (
            <div className="space-y-6 pb-12">
                <Header analysis={analysis} auditId={auditId} />
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/40" />
                    <h2 className="mt-3 text-sm font-semibold">
                        Aucun transfert à générer
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Aucun article n&apos;a été détecté comme vendu dans un
                        emplacement négatif.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300">
            <Header analysis={analysis} auditId={auditId} />

            {/* ─── KPI CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    label="Total Transferts"
                    value={analysis.totalLines.toString()}
                    subLabel={`${formatUSD(analysis.totalValue)} valorisés`}
                    icon={<Package className="w-4 h-4" />}
                    tone="neutral"
                />
                <KpiCard
                    label="Même Company"
                    value={stats.internalLines.toString()}
                    subLabel={`${formatUSD(stats.internalValue)} valorisés`}
                    icon={<Package className="w-4 h-4" />}
                    tone="emerald"
                />
                <KpiCard
                    label="Autre Company"
                    value={stats.interCoLines.toString()}
                    subLabel={`${stats.interCoCompanies} company${stats.interCoCompanies > 1 ? "ies" : ""
                        } source`}
                    icon={<Building2 className="w-4 h-4" />}
                    tone="amber"
                />
                <KpiCard
                    label="Non Résolus"
                    value={analysis.unprocessedItems.toString()}
                    subLabel="Items sans location Odoo"
                    icon={<AlertTriangle className="w-4 h-4" />}
                    tone="rose"
                />
            </div>

            {/* ─── FILTRES + EXPORT ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border">
                    <FilterTab
                        active={filter === "all"}
                        onClick={() => setFilter("all")}
                        label="Tout"
                        count={analysis.groups.length}
                    />
                    <FilterTab
                        active={filter === "internal_transfer"}
                        onClick={() => setFilter("internal_transfer")}
                        label="Même company"
                        count={
                            analysis.groups.filter(
                                (g) => g.action === "internal_transfer"
                            ).length
                        }
                    />
                    <FilterTab
                        active={filter === "inter_company"}
                        onClick={() => setFilter("inter_company")}
                        label="Autre company"
                        count={
                            analysis.groups.filter(
                                (g) => g.action === "inter_company"
                            ).length
                        }
                    />
                </div>

                <Button
                    onClick={handleExportExcel}
                    className="h-9 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Générer le fichier Excel Odoo
                </Button>
            </div>

            {/* ─── GROUPES ─── */}
            <div className="space-y-4">
                {filteredGroups.map((group, idx) => (
                    <GroupCard
                        key={`${group.action}-${group.sourceCompanyId}-${idx}`}
                        group={group}
                    />
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* SOUS-COMPOSANTS                                                  */
/* ═══════════════════════════════════════════════════════════════════ */

function Header({
    analysis,
    auditId,
}: {
    analysis: SoldElsewhereAnalysis;
    auditId: string;
}) {
    return (
        <div className="border-b border-border pb-5">
            <Link
                href={`/inventory/audits/${auditId}`}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase tracking-wider mb-2 transition-colors"
            >
                <ArrowLeft size={12} /> Retour à l&apos;audit{" "}
                {analysis.auditReference}
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Produits Vendus Ailleurs
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
                Générez les transferts Odoo (internes et inter-company) pour
                régulariser les stocks négatifs détectés.
            </p>
        </div>
    );
}

function KpiCard({
    label,
    value,
    subLabel,
    icon,
    tone,
}: {
    label: string;
    value: string;
    subLabel: string;
    icon: React.ReactNode;
    tone: "neutral" | "emerald" | "amber" | "rose";
}) {
    const toneClasses = {
        neutral: "text-foreground",
        emerald: "text-emerald-600",
        amber: "text-amber-600",
        rose: "text-rose-600",
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {label}
                </span>
                <span className={toneClasses[tone]}>{icon}</span>
            </div>
            <div
                className={cn(
                    "mt-2 text-2xl font-bold font-mono",
                    toneClasses[tone]
                )}
            >
                {value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
                {subLabel}
            </div>
        </div>
    );
}

function FilterTab({
    active,
    onClick,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                active
                    ? "bg-card shadow-xs text-foreground"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {label} ({count})
        </button>
    );
}

function GroupCard({ group }: { group: SoldElsewhereGroup }) {
    const isInternal = group.action === "internal_transfer";
    const badgeTone = isInternal
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700";

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-[10px] font-bold uppercase",
                            badgeTone
                        )}
                    >
                        {isInternal ? "Même company" : "Autre company"}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold">
                            {group.sourceCompanyName}
                        </span>
                        {!isInternal && (
                            <>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-semibold">
                                    {group.destinationCompanyName}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>
                        <strong className="font-mono text-foreground">
                            {group.lines.length}
                        </strong>{" "}
                        ligne{group.lines.length > 1 ? "s" : ""}
                    </span>
                    <span>•</span>
                    <span>
                        Qté{" "}
                        <strong className="font-mono text-foreground">
                            {group.totalQty}
                        </strong>
                    </span>
                    <span>•</span>
                    <span>
                        <strong className="font-mono text-foreground">
                            {formatUSD(group.totalValue)}
                        </strong>
                    </span>
                </div>
            </div>

            {/* TABLEAU */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border">
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            <th className="text-left py-2 px-3">
                                Code-barres
                            </th>
                            <th className="text-left py-2 px-3">Produit</th>
                            <th className="text-left py-2 px-3">Depuis</th>
                            <th className="text-left py-2 px-3">Vers</th>
                            <th className="text-center py-2 px-3">Qté</th>
                            <th className="text-right py-2 px-3">Valeur</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {group.lines.map((line, idx) => (
                            <tr
                                key={`${line.itemId}-${line.destinationLocationId}-${idx}`}
                                className="hover:bg-muted/20"
                            >
                                <td className="py-2 px-3 font-mono font-bold text-primary text-[11px]">
                                    {line.barcode}
                                </td>
                                <td className="py-2 px-3">
                                    {line.productName}
                                </td>
                                <td className="py-2 px-3 text-muted-foreground text-[11px]">
                                    <span className="font-medium">
                                        {line.sourceLocationName}
                                    </span>
                                </td>
                                <td className="py-2 px-3 text-muted-foreground text-[11px]">
                                    <span className="font-medium">
                                        {line.destinationCompanyName} /{" "}
                                        {line.destinationLocationName}
                                    </span>
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold">
                                    {line.quantity}
                                </td>
                                <td className="py-2 px-3 text-right font-mono">
                                    {formatUSD(
                                        line.quantity * line.unitCost
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}