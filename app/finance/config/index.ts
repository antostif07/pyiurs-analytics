import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  LayoutDashboard,
  Banknote,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  Users,
  TrendingUp,
  PieChart,
  Scale,
  History,
  Settings2,
  PiggyBank,
  MonitorPlay,
  Calculator,
  HandCoins,
  LibraryBig,
  BarChart3,
  CreditCard,
  Building2,
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Pilotage Financier",
    items: [
      {
        id: "cash-flow",
        label: "Cash Flow (Trésorerie)",
        icon: Banknote,
        path: "/finance",
        // badge: "Live", // Pour indiquer le temps réel
      },
    ],
  },
  {
    id: "revenue-analysis",
    title: "Analyse des Revenus",
    items: [
      {
        id: "arpu-tracking",
        label: "Performance ARPU",
        icon: TrendingUp,
        path: "/finance/arpu",
      },
      {
        id: "sales-tracking",
        label: "Suivi des Ventes POS",
        icon: MonitorPlay,
        path: "/finance/sales-control",
      },
      {
        id: "customer-invoices",
        label: "Facturation Clients",
        icon: Receipt,
        path: "/finance/invoices",
      },
    ],
  },
  {
    id: "disbursements",
    title: "Dépenses & Achats",
    items: [
      {
        id: "vendor-bills",
        label: "Factures Fournisseurs",
        icon: FileText,
        path: "/finance/vendor-bills",
      },
      {
        id: "expenses",
        label: "Notes de Frais",
        icon: CreditCard,
        path: "/finance/expenses",
      },
      {
        id: "payments",
        label: "Paiements & Décaissements",
        icon: ArrowDownRight,
        path: "/finance/payments",
      },
    ],
  },
  {
    id: "savings-funds",
    title: "Épargne & Fonds",
    items: [
      {
        id: "savings-tracking",
        label: "Suivi Épargne (Segments)",
        icon: PiggyBank,
        path: "/finance/savings",
      },
      {
        id: "funds-management",
        label: "Gestion des Fonds",
        icon: Wallet,
        path: "/finance/funds",
        roles: ["Admin", "Manager"],
      },
    ],
  },
  {
    id: "accounting",
    title: "Comptabilité & Audit",
    items: [
      {
        id: "ledger",
        label: "Grand Livre / Journaux",
        icon: LibraryBig,
        path: "/finance/ledger",
      },
      {
        id: "valuation",
        label: "Bilan & P&L",
        icon: Scale,
        path: "/finance/statements",
      },
      {
        id: "reconciliation",
        label: "Lettrage & Rapprochement",
        icon: Calculator,
        path: "/finance/reconciliation",
      },
    ],
  },
  {
    id: "analytics",
    title: "Rapports & Analyse",
    items: [
      {
        id: "performance-reports",
        label: "Rapports d'Activité",
        icon: PieChart,
        path: "/finance/reports",
      },
      {
        id: "cash-history",
        label: "Historique de Caisse",
        icon: History,
        path: "/finance/cash-history",
      },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    items: [
      {
        id: "bank-settings",
        label: "Comptes & Banques",
        icon: Building2,
        path: "/finance/settings/banks",
        roles: ["Admin"],
      },
      {
        id: "finance-config",
        label: "Paramètres Financiers",
        icon: Settings2,
        path: "/finance/settings",
        roles: ["Admin"],
      },
    ],
  },
];