// executive-cockpit.tsx
"use client";

import { useSearchParams } from "next/navigation";
import ReportPageHeader from "./report-page-header";
import GlobalFilters from "./global-filters";
import { ReportSection } from "./report-section";
import { parseFilters } from "../_lib/filters";
import type { ExecutiveCockpitData } from "../_lib/data/executive-cockpit";
import type { ReportFilter } from "../_lib/types/reports";

// ─── Tableaux de sections ────────────────────────────────────────────────
import SalesRevenueMatrixTable from "../sales/_components/sales-revenue-matrix-table";
import CustomerMatrixTable from "../customers/_components/customer-matrix-table";
import StockMovementMatrixTable from "../stock/_components/stock-movement-matrix-table";
import PurchaseDispatchMatrixTable from "../operations/purchases/_components/purchase-dispatch-matrix-table";
import PurchaseAuditFinanceTable from "../finance/_components/purchase-audit-finance-table";
import StoreStockAuditSizesTable from "../stock/_components/store-stock-audit-sizes-table";
import LeaseHrMatrixTable from "../hr/_components/lease-hr-matrix-table";
import CashOpexMatrixTable from "../cash/_components/cash-opex-matrix-table";

// ─── Hooks data (client) ────────────────────────────────────────────────
// NOTE : signature actuelle conservée (sans argument). On branchera `filters`
// dessus quand on patchera les hooks — l'URL est déjà la source de vérité.
import { useSalesMatrix } from "../sales/_lib/use-sales-matrix";
import { useCustomerSegmentation } from "../customers/_lib/hooks/use-customer-segmentation";
import { usePurchaseDispatch } from "../operations/purchases/_lib/hooks/use-purchase-dispatch";
import { useStockKpis } from "../stock/_lib/hooks/use-stock-kpis";
import TransferControlTable from "../operations/transfers/_components/transfer-control-table.tsx";
import { useTransfers } from "../operations/transfers/_lib/hooks/use-transfers";

type Props = { data: ExecutiveCockpitData };

export default function ExecutiveCockpit({ data }: Props) {
    // URL = source de vérité (plus de useState local ignoré)
    const searchParams = useSearchParams();
    const filters: ReportFilter = parseFilters(
        Object.fromEntries(searchParams.entries()),
    );

    // ─── Hooks ──────────────────────────────────────────────────────────
    const { data: salesData, isLoading: isSalesLoading } = useSalesMatrix();
    const { data: customerData, isLoading: isCustomerLoading } = useCustomerSegmentation();
    const { data: purchaseData, isLoading: isPurchaseLoading } = usePurchaseDispatch();
    const { data: stockData, isLoading: isStockLoading } = useStockKpis();
    const { data: transfersData, isLoading: isTransfersLoading } = useTransfers();

    // `data` (props RSC) reste disponible pour de futurs usages
    // (ex: bandeau alertes server-side). Non consommé pour l'instant.
    void data;

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <ReportPageHeader
                title="Executive Cockpit"
                subtitle="Vue consolidée de la performance Pyiurs"
            >
                <GlobalFilters filters={filters} compact />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <ReportSection
                    index={1}
                    title="Ventes & chiffre d'affaires"
                    href="/ceo-report/sales"
                >
                    <SalesRevenueMatrixTable
                        data={salesData}
                        isLoading={isSalesLoading}
                    />
                </ReportSection>

                <ReportSection
                    index={2}
                    title="Suivi clientèle · Flux · Segmentation"
                    href="/ceo-report/customers"
                >
                    <CustomerMatrixTable
                        data={customerData?.rows}
                        isLoading={isCustomerLoading}
                    />
                </ReportSection>

                <ReportSection
                    index={3}
                    title="Mouvements de stock"
                    href="/ceo-report/stock"
                >
                    <StockMovementMatrixTable
                        data={stockData?.movementsData}
                        isLoading={isStockLoading}
                    />
                </ReportSection>

                <ReportSection
                    index={4}
                    title="Achats PO & Dispatch"
                    href="/ceo-report/operations/purchases"
                >
                    <PurchaseDispatchMatrixTable
                        data={purchaseData?.tableRows}
                        isLoading={isPurchaseLoading}
                    />
                </ReportSection>

                <ReportSection
                    index={5}
                    title="Contrôle des transferts"
                    href="/ceo-report/operations/transfers"
                >
                    <TransferControlTable
                        data={transfersData?.transfers ?? []}
                    />
                </ReportSection>

                <ReportSection
                    index={6}
                    title="Audit comptabilité achats & frais"
                    href="/ceo-report/finance"
                >
                    <PurchaseAuditFinanceTable />
                </ReportSection>

                <ReportSection
                    index={7}
                    title="Trésorerie cash & OPEX"
                    href="/ceo-report/cash"
                >
                    <CashOpexMatrixTable />
                </ReportSection>

                <ReportSection
                    index={8}
                    title="Valorisation stock & tailles femme"
                    href="/ceo-report/stock"
                >
                    <StoreStockAuditSizesTable
                        data={stockData?.storeStockAuditSizesData}
                        isLoading={isStockLoading}
                    />
                </ReportSection>

                <ReportSection
                    index={9}
                    title="Immobilier · Fiscalité · RH"
                    href="/ceo-report/hr"
                >
                    <LeaseHrMatrixTable />
                </ReportSection>
            </div>
        </div>
    );
}