// app/ceo-report/operations/purchases/_components/purchase-dispatch-kpi-grid.tsx
"use client";

import { ShoppingBag, Truck, ArrowRightLeft, Warehouse } from "lucide-react";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import type { PurchaseDispatchKpisData } from "../_lib/types";

interface PurchaseDispatchKpiGridProps {
    data: PurchaseDispatchKpisData;
    isLoading?: boolean;
}

export default function PurchaseDispatchKpiGrid({
    data,
    isLoading = false,
}: PurchaseDispatchKpiGridProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Engagements PO */}
            <CeoKpiCard
                label="Engagements PO"
                value={`${data.poAmountTotal.toLocaleString("fr-FR")} $`}
                subtitle={`${data.categoriesCount} départements d'achats`}
                icon={<ShoppingBag className="w-4 h-4" />}
                iconColor="text-blue-600"
                iconBg="bg-blue-50 dark:bg-blue-950/50"
                isLoading={isLoading}
            />

            {/* 2. Reçu P.BC (Central) */}
            <CeoKpiCard
                label="Reçu P.BC (Central)"
                value={`${data.receivedPbcTotal.toLocaleString("fr-FR")} $`}
                subtitle={
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {data.receptionRate.toFixed(1)}% des commandes reçues
                    </span>
                }
                icon={<Truck className="w-4 h-4" />}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50 dark:bg-emerald-950/50"
                valueColor="text-emerald-600 dark:text-emerald-400"
                isLoading={isLoading}
            />

            {/* 3. Dispatch Boutiques */}
            <CeoKpiCard
                label="Dispatch Boutiques"
                value={`${data.transferredTotal.toLocaleString("fr-FR")} $`}
                subtitle={`${data.transferRate.toFixed(1)}% des réceptions expédiées`}
                icon={<ArrowRightLeft className="w-4 h-4" />}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50 dark:bg-indigo-950/50"
                valueColor="text-indigo-600 dark:text-indigo-400"
                isLoading={isLoading}
            />

            {/* 4. Stock Tampon P.BC */}
            <CeoKpiCard
                label="Stock Tampon P.BC"
                value={`${data.reliquatPbcTotal.toLocaleString("fr-FR")} $`}
                subtitle="Stock de sécurité conservé au central"
                icon={<Warehouse className="w-4 h-4" />}
                iconColor="text-amber-600"
                iconBg="bg-amber-50 dark:bg-amber-950/50"
                valueColor="text-amber-600 dark:text-amber-400"
                isLoading={isLoading}
            />
        </div>
    );
}