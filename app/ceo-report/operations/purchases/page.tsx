// app/ceo-report/operations/purchases/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import PurchaseDispatchClient from "./purchase-dispatch-client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Achats PO & Dispatch Boutiques | Rapport DG",
    description: "Pilotage des commandes fournisseurs, réceptions au magasin central (P.BC) et dispatch boutiques.",
};

export default async function PurchasesPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <PurchaseDispatchClient />
        </Suspense>
    );
}