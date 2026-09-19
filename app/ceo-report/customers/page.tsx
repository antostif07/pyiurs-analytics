// app/ceo-report/customers/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import CustomersClient from "./customers-client";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <CustomersClient />
        </Suspense>
    );
}