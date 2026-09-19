// app/ceo-report/hr/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import HrClient from "./hr-client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Ressources Humaines & Baux Commerciaux | Rapport DG",
    description: "Suivi de la masse salariale, effectifs, compteurs de congés et échéancier des loyers.",
};

export default function HrPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <HrClient />
        </Suspense>
    );
}