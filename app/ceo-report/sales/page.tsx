// app/ceo-report/sales/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import SalesMatrixClient from "./sales-matrix-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Performance Commerciale & Matrice des Revenus",
    description:
        "Matrice croisée des ventes POS et e-commerce par boutique et par segment (Femme, Kids, Beauty) avec suivi des écarts budgétaires.",
};

export default async function CeoSalesMatrixPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Suspense fallback={<DashboardSkeleton />}>
                <SalesMatrixClient />
            </Suspense>
        </div>
    );
}