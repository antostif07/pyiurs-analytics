import {
    LayoutDashboard,
    Package,
    TrendingUp,
    Banknote,
    Settings2,
    Users,
    Truck,
    PackageCheck,
} from "lucide-react";
import type { NavGroup, NavItem } from "@/components/new-ui/layout/app-sidebar";
import type { UserRole } from "@/lib/constants";

/**
 * Préfixe racine du module.
 * Modifiez ici en "/dg-report" si le dossier dans app/ s'appelle dg-report.
 */
export const CEO_REPORT_BASE_PATH = "/ceo-report" as const;

/**
 * Rôles ayant accès par défaut aux métriques exécutives de ce module
 */
const DEFAULT_EXEC_ROLES: UserRole[] = ["admin", "manager"];

/**
 * Navigation latérale du module Rapport DG / CEO Intelligence.
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
                path: CEO_REPORT_BASE_PATH,
                roles: DEFAULT_EXEC_ROLES,
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
                path: `${CEO_REPORT_BASE_PATH}/stock`,
                badge: "Nouveau",
                roles: DEFAULT_EXEC_ROLES,
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
                path: `${CEO_REPORT_BASE_PATH}/sales`,
                roles: DEFAULT_EXEC_ROLES,
            },
        ],
    },
    {
        id: "customers",
        title: "Clientèle",
        items: [
            {
                id: "dg-customers-matrix",
                label: "Suivi & Segmentation",
                icon: Users,
                path: `${CEO_REPORT_BASE_PATH}/customers`,
                // badge: "Point 2",
                roles: DEFAULT_EXEC_ROLES,
            },
        ],
    },
    {
        id: "finance",
        title: "Finance",
        items: [
            {
                id: "dg-finance-audit",
                label: "Audit Achats & Frais Approche",
                icon: Banknote,
                path: `${CEO_REPORT_BASE_PATH}/finance`,
                badge: "Point 6",
                roles: DEFAULT_EXEC_ROLES,
            },
        ],
    },
    {
        id: "operations",
        title: "Opérations",
        items: [
            {
                id: "dg-purchases-dispatch",
                label: "Achats PO & Dispatch",
                icon: Truck,
                path: `${CEO_REPORT_BASE_PATH}/operations/purchases`,
                roles: DEFAULT_EXEC_ROLES,
            },
            {
                id: "dg-transfers-control",
                label: "Contrôle des Transferts",
                icon: PackageCheck,
                path: `${CEO_REPORT_BASE_PATH}/operations/transfers`,
                badge: "Audit TR",
                roles: DEFAULT_EXEC_ROLES,
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
                path: `${CEO_REPORT_BASE_PATH}/hr`,
                roles: DEFAULT_EXEC_ROLES,
            },
        ],
    },
];

/**
 * Liste aplatie de tous les items de navigation
 */
export const DG_REPORT_ALL_ITEMS: NavItem[] = DG_REPORT_NAV_GROUPS.flatMap(
    (group) => group.items
);

/**
 * Map indexée par chemin d'accès (Lookup en O(1) pour le Topbar et Breadcrumbs)
 */
export const DG_REPORT_ITEMS_BY_PATH = new Map<string, NavItem>(
    DG_REPORT_ALL_ITEMS.map((item) => [item.path, item])
);  