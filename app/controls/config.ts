import type { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import type { UserRole } from "@/lib/constants";
import {
    ClipboardCheck,
    Barcode,
    BadgePercent,
    PackageCheck,
    PackageSearch,
    ArrowLeftRight,
} from "lucide-react";

const CONTROLS_ADMIN_CONTROLLER: UserRole[] = ["admin", "controller"];
const CONTROLS_SALES_SCOPE: UserRole[] = ["admin", "controller", "manager"];
const CONTROLS_STOCK_PO_SCOPE: UserRole[] = [
    "admin",
    "controller",
    "inventory-manager",
    "inventory_manager",
];
const CONTROLS_TRANSFERS_SCOPE: UserRole[] = [
    "admin",
    "controller",
    "manager",
    "inventory-manager",
    "inventory_manager",
];

export const NAV_GROUPS: NavGroup[] = [
    {
        id: "overview",
        title: "Pilotage Contrôles",
        items: [
            {
                id: "controls-dashboard",
                label: "Vue d'ensemble",
                icon: ClipboardCheck,
                path: "/controls",
                roles: CONTROLS_ADMIN_CONTROLLER,
            },
        ],
    },
    {
        id: "sales-controls",
        title: "Vente",
        items: [
            {
                id: "controls-no-code",
                label: "Ventes sans code",
                icon: Barcode,
                path: "/controls/sans-code",
                roles: CONTROLS_SALES_SCOPE,
            },
            {
                id: "controls-discount-validation",
                label: "Validation de remise",
                icon: BadgePercent,
                path: "/controls/validation-remise",
                roles: CONTROLS_SALES_SCOPE,
            },
        ],
    },
    {
        id: "stock-controls",
        title: "Stock",
        items: [
            {
                id: "controls-stock-po",
                label: "Stock PO",
                icon: PackageCheck,
                path: "/controls/stock-po",
                roles: CONTROLS_STOCK_PO_SCOPE,
            },
            {
                id: "controls-stock-polog",
                label: "Stock POLOG",
                icon: PackageSearch,
                path: "/controls/stock-polog",
                roles: CONTROLS_STOCK_PO_SCOPE,
            },
            {
                id: "controls-store-transfers",
                label: "Transferts Inter-Boutiques",
                icon: ArrowLeftRight,
                path: "/controls/store-transfers",
                roles: CONTROLS_TRANSFERS_SCOPE,
            },
        ],
    },
];