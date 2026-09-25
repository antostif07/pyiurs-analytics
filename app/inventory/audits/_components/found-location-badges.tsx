"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FoundLocation, StockAuditItem } from "../_lib/types";

const normalizeLocations = (value: unknown): FoundLocation[] => {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (v): v is FoundLocation =>
            typeof v === "object" &&
            v !== null &&
            typeof (v as any).id === "number" &&
            typeof (v as any).name === "string"
    );
};

interface Props {
    locations: StockAuditItem["found_locations"];
    /** Affiche la quantité si > 1 */
    showQuantity?: boolean;
    /** Limite le nombre de badges visibles (défaut 2) */
    maxVisible?: number;
}

export function FoundLocationsBadges({
    locations,
    showQuantity = true,
    maxVisible = 2,
}: Props) {
    const items = normalizeLocations(locations);

    if (items.length === 0) {
        return (
            <span className="text-[10px] text-muted-foreground/50 italic">
                —
            </span>
        );
    }

    const visible = items.slice(0, maxVisible);
    const rest = items.length - visible.length;

    return (
        <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
            {visible.map((loc) => {
                const qty = loc.quantity > 1 && showQuantity ? ` ×${loc.quantity}` : "";
                return (
                    <Badge
                        key={loc.id}
                        variant="outline"
                        className={cn(
                            "text-[9px] font-normal border-sky-500/30 bg-sky-500/5 text-sky-700",
                            "flex items-center gap-0.5 whitespace-nowrap"
                        )}
                        title={`${loc.company_name} / ${loc.name}`}
                    >
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[140px]">
                            {loc.name}
                            {qty}
                        </span>
                    </Badge>
                );
            })}
            {rest > 0 && (
                <Badge
                    variant="outline"
                    className="text-[9px] font-normal border-border/60 bg-muted/20 text-muted-foreground"
                    title={items
                        .slice(maxVisible)
                        .map((l) => `[${l.id}] ${l.name}`)
                        .join("\n")}
                >
                    +{rest}
                </Badge>
            )}
        </div>
    );
}