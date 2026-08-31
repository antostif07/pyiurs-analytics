"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { StockAuditItem, isItemScanned } from "../_lib/types";

interface Props {
    item: StockAuditItem;
}

export const ScanStatusBadge = React.memo(function ScanStatusBadge({ item }: Props) {
    const scanned = isItemScanned(item);
    const isUnexpected = item.theoretical_qty === 0 && scanned;

    if (isUnexpected) {
        return (
            <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-bold">
                <AlertTriangle className="w-2.5 h-2.5 mr-1 text-purple-600" /> Hors Périmètre (+1)
            </Badge>
        );
    }

    if (scanned) {
        return (
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Scanné (1/1)
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 font-medium">
            En Attente (0/1)
        </Badge>
    );
});