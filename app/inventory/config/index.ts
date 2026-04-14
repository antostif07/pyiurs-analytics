import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  SlidersHorizontal,
  Truck,
  Tags,
  Shuffle,
  ShoppingCart,
  ReceiptText,
  FileText,
  Users,
  Store,
  BarChart3,
  TrendingUp,
  PieChart,
  FilePlus,
  UserCog,
  ShieldCheck,
  Settings,
  Plug,
  Bell,
  Undo2,
  ClipboardCheck,
  RefreshCcw,
  Layers,
  CalendarClock,
  PackageSearch,
  Zap,
  Warehouse,
  Scale,
  FileBarChart2,
  Settings2,
  History,
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Pilotage Stock",
    items: [
      {
        id: "stock-dashboard",
        label: "Tableau de Bord",
        icon: LayoutDashboard,
        path: "/inventory",
      },
      {
        id: "real-time-stock",
        label: "État des Stocks",
        icon: Boxes,
        path: "/inventory/current-stock",
        badge: 14, // Alertes stock bas ou ruptures
      },
    ],
  },
  {
    id: "operations",
    title: "Opérations Flux",
    items: [
      {
        id: "receptions",
        label: "Réceptions Fournisseurs",
        icon: Truck,
        path: "/inventory/receptions",
        badge: 3, // Livraisons attendues
      },
      {
        id: "transfers",
        label: "Transferts Inter-Boutiques",
        icon: ArrowLeftRight,
        path: "/inventory/transfers",
      },
      {
        id: "returns",
        label: "Retours & SAV",
        icon: Undo2,
        path: "/inventory/returns",
      },
      {
        id: "adjustments",
        label: "Ajustements & Inventaire",
        icon: ClipboardCheck,
        path: "/inventory/adjustments",
      },
      {
        id: "scrap",
        label: "Mise au Rebut / Casse",
        icon: RefreshCcw,
        path: "/inventory/scrap",
      },
    ],
  },
  {
    id: "products",
    title: "Catalogue Articles",
    items: [
      {
        id: "all-products",
        label: "Produits & Variantes",
        icon: Tags,
        path: "/inventory/products",
      },
      {
        id: "attributes",
        label: "Tailles / Couleurs / Styles",
        icon: Layers,
        path: "/inventory/attributes",
      },
      {
        id: "lots-batches",
        label: "Lots & Péremption (Cosmétique)",
        icon: CalendarClock,
        path: "/inventory/tracking",
      },
      {
        id: "barcodes",
        label: "Étiquetage & Barcodes",
        icon: PackageSearch,
        path: "/inventory/barcodes",
      },
    ],
  },
  {
    id: "procurement",
    title: "Réapprovisionnement",
    items: [
      {
        id: "replenishment-rules",
        label: "Règles de Stock Minimum",
        icon: Zap,
        path: "/inventory/replenishment",
      },
      {
        id: "suppliers-portal",
        label: "Annuaire Fournisseurs",
        icon: Warehouse,
        path: "/inventory/suppliers",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analyse & Valorisation",
    items: [
      {
        id: "stock-valuation",
        label: "Valorisation (PUMP/FIFO)",
        icon: Scale,
        path: "/inventory/valuation",
      },
      {
        id: "movement-history",
        label: "Historique des Mouvements",
        icon: History,
        path: "/inventory/history",
      },
      {
        id: "inventory-performance",
        label: "Rotation des Stocks",
        icon: BarChart3,
        path: "/inventory/performance",
      },
      {
        id: "stock-reports",
        label: "Rapports d'Activité",
        icon: FileBarChart2,
        path: "/inventory/reports",
      },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    items: [
      {
        id: "warehouse-settings",
        label: "Entrepôts & Emplacements",
        icon: Settings2,
        path: "/inventory/settings",
        roles: ["Admin", "Manager"],
      },
    ],
  },
];
