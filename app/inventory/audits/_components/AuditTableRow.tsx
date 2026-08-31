"use client";

import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    PlusCircle,
    Loader2,
    Calendar,
    Tag,
    Layers,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StockAuditItem, isItemScanned } from "../_lib/types";
import { SoldLocationsBadges } from "./SoldLocationsBadges";
import { ScanStatusBadge } from "./ScanStatusBadge";

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

interface Props {
    item: StockAuditItem;
    isReadOnly: boolean;
    isProcessing: boolean;
    onForceMarkFound: (item: StockAuditItem) => void;
}

export const AuditTableRow = React.memo(function AuditTableRow({
    item,
    isReadOnly,
    isProcessing,
    onForceMarkFound,
}: Props) {
    const scanned = isItemScanned(item);
    const diff = (item.counted_qty ?? 0) - (item.theoretical_qty ?? 0);
    const impact = diff * (Number(item.unit_cost) || 0);

    return (
        <TableRow
            className={cn(
                "transition-colors",
                scanned ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "hover:bg-muted/30"
            )}
        >
            <TableCell className="py-2.5 px-4 font-mono font-bold text-primary text-xs">
                <div className="flex flex-col">
                    <span>{item.internal_barcode}</span>
                    {item.odoo_create_date && (
                        <span className="text-[10px] text-muted-foreground font-light font-sans flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(item.odoo_create_date), "dd MMM yyyy", { locale: fr })}
                        </span>
                    )}
                </div>
            </TableCell>

            <TableCell className="py-2.5 px-4 font-sans font-semibold text-foreground">
                <div className="flex flex-col gap-1">
                    <span>{item.product_name}</span>
                    <div className="flex flex-wrap items-center gap-1">
                        {item.brand && item.brand !== "N/A" && (
                            <Badge variant="outline" className="text-[9px] font-normal border-border/80 bg-muted/20">
                                <Tag className="w-2.5 h-2.5 mr-1 text-primary" /> {item.brand}
                            </Badge>
                        )}
                        {item.color && item.color !== "N/A" && (
                            <Badge variant="outline" className="text-[9px] font-normal border-border/80 bg-muted/20">
                                <Layers className="w-2.5 h-2.5 mr-1 text-amber-500" /> {item.color}
                            </Badge>
                        )}
                        {item.hs_code && item.hs_code !== "N/A" && (
                            <span className="text-[9px] text-muted-foreground font-mono">HS: {item.hs_code}</span>
                        )}
                    </div>
                </div>
            </TableCell>

            <TableCell className="py-2.5 px-4 font-sans text-muted-foreground font-medium text-[11px]">
                {item.supplier_ref || "Stock Principal"}
            </TableCell>

            <TableCell className="py-2.5 px-4 font-sans text-xs">
                <SoldLocationsBadges locations={item.sold_locations} />
            </TableCell>

            <TableCell className="py-2.5 px-4 text-center text-muted-foreground font-bold">
                {item.theoretical_qty}
            </TableCell>

            <TableCell className="py-2.5 px-4 text-center font-sans">
                <ScanStatusBadge item={item} />
            </TableCell>

            <TableCell className="py-2.5 px-4 text-right font-bold">
                <span className={cn(diff < 0 ? "text-rose-600" : "text-muted-foreground/60")}>
                    {formatUSD(impact)}
                </span>
            </TableCell>

            {!isReadOnly && (
                <TableCell className="py-2.5 px-4 text-right font-sans">
                    {!scanned ? (
                        <Button
                            onClick={() => onForceMarkFound(item)}
                            disabled={isProcessing}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-semibold border-emerald-600/40 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <PlusCircle className="w-3 h-3 mr-1" />
                            )}
                            <span>Retrouvé (+1)</span>
                        </Button>
                    ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                    )}
                </TableCell>
            )}
        </TableRow>
    );
});