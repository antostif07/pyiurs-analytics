// app/ceo-report/operations/transfers/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import TransfersClient from "./transfers-client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Contrôle des Transferts & Audit Codes-Barres | Rapport DG",
    description: "Surveillance de la conformité documentaire et du scanning des transferts inter-boutiques.",
};

export default async function TransfersControlPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <TransfersClient />
        </Suspense>
    );
}