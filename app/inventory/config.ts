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
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
    {
        id: "overview-group",
        title: "Synthèse & Suivi",
        items: [
            {
                id: "overview",
                label: "Vue d'ensemble Stocks",
                icon: LayoutDashboard,
                path: "/inventory",
                roles: ["admin", "manager", "inventory-manager", "financier"],
            },
            {
                id: "sans-code",
                label: "Produits Sans-Code / HS",
                icon: FileText,
                path: "/inventory/sans-code",
                roles: ["admin", "manager", "inventory-manager"],
            },
            {
                id: "stock-alerts",
                label: "Alertes de Rupture",
                icon: AlertTriangle,
                path: "/inventory/alerts",
                roles: ["admin", "manager", "inventory-manager"],
            }
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
                roles: ["admin", "manager", "inventory-manager"],
            },
            {
                id: "stock-transfers",
                label: "Transferts Inter-Boutiques",
                icon: Truck, // ✅ Transferts depuis la centrale PB - BC vers les boutiques
                path: "/inventory/transfers",
                roles: ["admin", "manager", "inventory-manager"],
            },
            {
                id: "stock-adjustments",
                label: "Ajustements & Démarque",
                icon: SlidersHorizontal,
                path: "/inventory/adjustments",
                roles: ["admin", "manager", "inventory-manager"],
            }
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
                roles: ["admin", "manager", "inventory-manager", "financier"],
            },
            {
                id: "purchases-analytics",
                label: "Analytiques BI Achats",
                icon: BarChart3,
                path: "/inventory/purchases/analytics",
                roles: ["admin", "manager", "financier"],
            }
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
            }
        ],
    }
];