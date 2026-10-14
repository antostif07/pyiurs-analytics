// app/finance/cash-flow/cash-flow-client.tsx
"use client";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import { useCashflow } from "./_lib/hooks/use-cashflow";
import CashflowMatrix from "./_components/cashflow-matrix";

export default function CashFlowClient() {
  const { data, isLoading, dataUpdatedAt } = useCashflow();

  return (
    <div>
      <ReportPageHeader
        title="Cash Flow"
        subtitle="Journal de trésorerie par méthode · par société"
        badge={{ label: "Live Odoo", tone: "emerald" }}
        lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        isLoading={isLoading}
      />

      <div className="p-4 sm:p-5 space-y-4">
        <ReportSection index={1} title="Trésorerie consolidée">
          <CashflowMatrix data={data} isLoading={isLoading} />
        </ReportSection>
      </div>
    </div>
  );
}