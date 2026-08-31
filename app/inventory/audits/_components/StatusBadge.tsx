"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
    isReadOnly: boolean;
    isCompleted: boolean;
}

export const StatusBadge = React.memo(function StatusBadge({ isReadOnly, isCompleted }: Props) {
    const config = isReadOnly
        ? {
            className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
            label: "Validé & Clôturé",
        }
        : isCompleted
            ? {
                className: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
                label: "Comptage Terminé",
            }
            : {
                className: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                label: "Scan en Cours",
            };

    return (
        <Badge className={cn("text-[9px] font-bold font-mono", config.className)}>
            {config.label}
        </Badge>
    );
});