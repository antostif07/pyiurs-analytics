// app/ceo-report/stock/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import StockClient from "./stock-client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Mouvements & Valorisation Stock | Rapport DG",
    description: "Bilan des flux de stock : achats fournisseurs, ventes, ajustements et valorisation.",
};

export default function StockPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <StockClient />
        </Suspense>
    );
}