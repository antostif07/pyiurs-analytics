import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  LayoutDashboard,
  FileText,
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    title: "Home",
    items: [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        path: "/inventory",
      },
      {
        id: "sans-code",
        label: "Suivi Produits Sans-Code",
        icon: FileText,
        path: "/inventory/sans-code",
      }
    ],
  },
  // {
  //   id: "inventory",
  //   title: "Inventory",
  //   items: [
  //     {
  //       id: "stock-overview",
  //       label: "Stock Overview",
  //       icon: Boxes,
  //       path: "/inventory/stock",
  //       badge: 4,
  //     },
  //     {
  //       id: "stock-movements",
  //       label: "Stock Movements",
  //       icon: ArrowLeftRight,
  //       path: "/inventory/movements",
  //     },
  //     {
  //       id: "stock-adjustments",
  //       label: "Adjustments",
  //       icon: SlidersHorizontal,
  //       path: "/inventory/adjustments",
  //     },
  //     {
  //       id: "transfers",
  //       label: "Transfers",
  //       icon: Shuffle,
  //       path: "/inventory/transfers",
  //     },
  //     {
  //       id: "suppliers",
  //       label: "Suppliers",
  //       icon: Truck,
  //       path: "/inventory/suppliers",
  //     },
  //     {
  //       id: "categories",
  //       label: "Categories & Products",
  //       icon: Tags,
  //       path: "/inventory/categories",
  //     },
  //   ],
  // },
  // {
  //   id: "sales",
  //   title: "Sales",
  //   items: [
  //     {
  //       id: "orders",
  //       label: "Orders",
  //       icon: ShoppingCart,
  //       path: "/sales/orders",
  //       badge: 12,
  //     },
  //     {
  //       id: "transactions",
  //       label: "Transactions",
  //       icon: ReceiptText,
  //       path: "/sales/transactions",
  //     },
  //     {
  //       id: "invoices",
  //       label: "Invoices",
  //       icon: FileText,
  //       path: "/sales/invoices",
  //     },
  //     {
  //       id: "customers",
  //       label: "Customers",
  //       icon: Users,
  //       path: "/sales/customers",
  //     },
  //   ],
  // },
  // {
  //   id: "shops",
  //   title: "Shops & Locations",
  //   items: [
  //     {
  //       id: "all-shops",
  //       label: "All Shops",
  //       icon: Store,
  //       path: "/shops",
  //     },
  //     {
  //       id: "shop-performance",
  //       label: "Performance",
  //       icon: TrendingUp,
  //       path: "/shops/performance",
  //     },
  //   ],
  // },
  // {
  //   id: "reports",
  //   title: "Reports & Analytics",
  //   items: [
  //     {
  //       id: "sales-reports",
  //       label: "Sales Reports",
  //       icon: BarChart3,
  //       path: "/reports/sales",
  //     },
  //     {
  //       id: "stock-reports",
  //       label: "Stock Reports",
  //       icon: PieChart,
  //       path: "/reports/stock",
  //     },
  //     {
  //       id: "profit-loss",
  //       label: "Profit & Loss",
  //       icon: TrendingUp,
  //       path: "/reports/pnl",
  //     },
  //     {
  //       id: "custom-reports",
  //       label: "Custom Reports",
  //       icon: FilePlus,
  //       path: "/reports/custom",
  //       roles: ["Admin"],
  //     },
  //   ],
  // },
  // {
  //   id: "users",
  //   title: "Users & Roles",
  //   items: [
  //     {
  //       id: "team",
  //       label: "Team Members",
  //       icon: UserCog,
  //       path: "/users/team",
  //       roles: ["Admin"],
  //     },
  //     {
  //       id: "permissions",
  //       label: "Permissions",
  //       icon: ShieldCheck,
  //       path: "/users/permissions",
  //       roles: ["Admin"],
  //     },
  //   ],
  // },
  // {
  //   id: "settings",
  //   title: "Settings",
  //   items: [
  //     {
  //       id: "general-settings",
  //       label: "General Settings",
  //       icon: Settings,
  //       path: "/settings",
  //       roles: ["Admin"],
  //     },
  //     {
  //       id: "integrations",
  //       label: "Integrations",
  //       icon: Plug,
  //       path: "/settings/integrations",
  //       roles: ["Admin"],
  //     },
  //     {
  //       id: "notifications",
  //       label: "Notifications",
  //       icon: Bell,
  //       path: "/settings/notifications",
  //     },
  //   ],
  // },
];