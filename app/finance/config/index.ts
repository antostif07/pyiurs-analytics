import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import { UserRole } from "@/lib/constants";
import {
  Banknote,
  Wallet,
  ArrowDownRight,
  Receipt,
  FileText,
  TrendingUp,
  PieChart,
  Scale,
  History,
  Settings2,
  PiggyBank,
  MonitorPlay,
  Calculator,
  LibraryBig,
  CreditCard,
  Building2,
} from "lucide-react";

const FULL_ACCESS: UserRole[] = ["admin", "manager", "financier"];
const EXPENSES_ACCESS: UserRole[] = ["admin", "manager", "financier", "controller"];

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
        roles: FULL_ACCESS,
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
        roles: FULL_ACCESS,
      },
      {
        id: "sales-tracking",
        label: "Suivi des Ventes POS",
        icon: MonitorPlay,
        path: "/finance/sales-control",
        roles: FULL_ACCESS,
      },
      {
        id: "customer-invoices",
        label: "Facturation Clients",
        icon: Receipt,
        path: "/finance/invoices",
        roles: FULL_ACCESS,
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
        roles: FULL_ACCESS,
      },
      {
        id: "expenses",
        label: "Notes de Frais",
        icon: CreditCard,
        path: "/finance/expenses",
        roles: EXPENSES_ACCESS,
      },
      {
        id: "payments",
        label: "Paiements & Décaissements",
        icon: ArrowDownRight,
        path: "/finance/payments",
        roles: FULL_ACCESS,
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
        roles: FULL_ACCESS,
      },
      {
        id: "funds-management",
        label: "Gestion des Fonds",
        icon: Wallet,
        path: "/finance/funds",
        roles: FULL_ACCESS,
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
        roles: FULL_ACCESS,
      },
      {
        id: "valuation",
        label: "Bilan & P&L",
        icon: Scale,
        path: "/finance/statements",
        roles: FULL_ACCESS,
      },
      {
        id: "reconciliation",
        label: "Lettrage & Rapprochement",
        icon: Calculator,
        path: "/finance/reconciliation",
        roles: FULL_ACCESS,
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
        roles: FULL_ACCESS,
      },
      {
        id: "cash-history",
        label: "Historique de Caisse",
        icon: History,
        path: "/finance/cash-history",
        roles: FULL_ACCESS,
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
        roles: FULL_ACCESS,
      },
      {
        id: "finance-config",
        label: "Paramètres Financiers",
        icon: Settings2,
        path: "/finance/settings",
        roles: FULL_ACCESS,
      },
    ],
  },
];