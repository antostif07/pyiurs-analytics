import {
    LayoutDashboard,
    Package,
    TrendingUp,
    Banknote,
    Settings2,
    Users,
} from "lucide-react";
import type { NavGroup, NavItem } from "@/components/new-ui/layout/app-sidebar";

/**
 * Navigation latérale du module Rapport DG.
 * Toutes les routes sont préfixées par /dg-report.
 */
export const DG_REPORT_NAV_GROUPS: NavGroup[] = [
    {
        id: "overview",
        title: "Vue d'ensemble",
        items: [
            {
                id: "dg-dashboard",
                label: "Tableau de bord",
                icon: LayoutDashboard,
                path: "/ceo-report",
                roles: ["admin", "manager"],
            },
        ],
    },
    {
        id: "stock",
        title: "Stock",
        items: [
            {
                id: "dg-stock-overview",
                label: "Vue Stock",
                icon: Package,
                path: "/dg-report/stock",
                badge: "Nouveau",
                roles: ["admin", "manager"],
            },
        ],
    },
    {
        id: "sales",
        title: "Commercial",
        items: [
            {
                id: "dg-sales-overview",
                label: "Ventes",
                icon: TrendingUp,
                path: "/dg-report/sales",
                roles: ["admin", "manager"],
            },
        ],
    },
    {
        id: "finance",
        title: "Finance",
        items: [
            {
                id: "dg-finance-overview",
                label: "Synthèse financière",
                icon: Banknote,
                path: "/dg-report/finance",
                roles: ["admin", "manager"],
            },
        ],
    },
    {
        id: "operations",
        title: "Opérations",
        items: [
            {
                id: "dg-operations-overview",
                label: "Opérations",
                icon: Settings2,
                path: "/dg-report/operations",
                roles: ["admin", "manager"],
            },
        ],
    },
    {
        id: "hr",
        title: "Ressources Humaines",
        items: [
            {
                id: "dg-hr-overview",
                label: "RH",
                icon: Users,
                path: "/dg-report/hr",
                roles: ["admin", "manager"],
            },
        ],
    },
];

/**
 * Helper : aplatit tous les items pour un accès rapide par id ou path.
 */
export const DG_REPORT_ALL_ITEMS: NavItem[] = DG_REPORT_NAV_GROUPS.flatMap(
    (group) => group.items
);