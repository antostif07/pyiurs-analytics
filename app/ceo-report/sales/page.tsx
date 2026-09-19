// app/ceo-report/sales/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import SalesMatrixClient from "./sales-matrix-client";

export const dynamic = "force-dynamic";

export default async function CeoSalesMatrixPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Suspense fallback={<DashboardSkeleton />}>
                <SalesMatrixClient />
            </Suspense>
        </div>
    );
}