import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
    LayoutDashboard,
    FileText,
    ShoppingBag,
    BarChart3,
    ArrowLeftRight,
    SlidersHorizontal,
    AlertTriangle,
    DollarSign,
    Truck,
    ScanLine,
    Layers,
    Sparkles,
} from "lucide-react";

export const INVENTORY_NAV_GROUPS: NavGroup[] = [
    {
        id: "overview-group",
        title: "Synthèse & Suivi",
        items: [
            {
                id: "overview",
                label: "Vue d'ensemble Stocks",
                icon: LayoutDashboard,
                path: "/inventory",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager", "financier"],
            },
            {
                id: "stock-audits",
                label: "Inventaires & Audits",
                icon: ScanLine,
                path: "/inventory/audits",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager"],
            },
            {
                id: "sans-code",
                label: "Produits Sans-Code / HS",
                icon: FileText,
                path: "/inventory/sans-code",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager"],
            },
            {
                id: "stock-alerts",
                label: "Alertes de Rupture",
                icon: AlertTriangle,
                path: "/inventory/alerts",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager"],
                // Le badge numérique peut être mis à jour dynamiquement via un state / context
            },
        ],
    },
    {
        id: "segments-stock-group",
        title: "Suivi par Segment",
        items: [
            {
                id: "stock-femme",
                label: "Suivi Stock Femme",
                icon: Layers,
                path: "/inventory/stock-femme",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager", "user"],
            },
            {
                id: "stock-beauty",
                label: "Suivi Stock Beauty",
                icon: Sparkles,
                path: "/inventory/stock-beauty",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager", "user"],
            },
        ],
    },
    {
        id: "movements-group",
        title: "Mouvements & Transferts",
        items: [
            {
                id: "stock-movements",
                label: "Mouvements de Stock",
                icon: ArrowLeftRight,
                path: "/inventory/movements",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager"],
            },
            {
                id: "stock-transfers",
                label: "Transferts Inter-Boutiques",
                icon: Truck,
                path: "/inventory/transfers",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager"],
            },
            {
                id: "stock-adjustments",
                label: "Ajustements & Démarque",
                icon: SlidersHorizontal,
                path: "/inventory/adjustments",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager"],
            },
        ],
    },
    {
        id: "purchases-group",
        title: "Achats & Réceptions",
        items: [
            {
                id: "purchases-overview",
                label: "Aperçu des Achats",
                icon: ShoppingBag,
                path: "/inventory/purchases",
                roles: ["admin", "manager", "inventory_manager", "inventory-manager", "financier"],
            },
            {
                id: "purchases-analytics",
                label: "Analytiques BI Achats",
                icon: BarChart3,
                path: "/inventory/purchases/analytics",
                roles: ["admin", "manager", "financier"],
            },
        ],
    },
    {
        id: "valuation-group",
        title: "Valorisation & Finance",
        items: [
            {
                id: "stock-valuation",
                label: "Valorisation du Stock ($)",
                icon: DollarSign,
                path: "/inventory/valuation",
                roles: ["admin", "manager", "financier"],
            },
        ],
    },
];