// app/ceo-report/cash/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import CashClient from "./cash-client";

export const dynamic = "force-dynamic";

export default function CashPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <CashClient />
        </Suspense>
    );
}