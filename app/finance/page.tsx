// app/finance/cash-flow/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import CashFlowClient from "./cash-flow-client";

export const metadata = {
  title: "Cash Flow | Finance",
  description: "Trésorerie par méthode et par société.",
};

export const dynamic = "force-dynamic";

export default function CashFlowPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CashFlowClient />
    </Suspense>
  );
}