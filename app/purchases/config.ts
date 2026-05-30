import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  ShoppingBag,
  FileText,
  Truck,
  Tags,
  Wallet,
  TrendingDown,
  BarChart3, // Nouvelle icône importée pour la page analytique
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Principale",
    items: [
      {
        id: "dashboard",
        label: "Vue d'ensemble",
        icon: ShoppingBag,
        path: "/purchases",
      },
      {
        id: "orders",
        label: "Bons de commande",
        icon: FileText,
        path: "/purchases/orders",
      }
    ],
  },
  {
    id: "purchases-analysis",
    title: "Analyse & Gestion",
    items: [
      {
        id: "analytics", // Nouveau lien ajouté ici
        label: "Analytiques BI",
        icon: BarChart3,
        path: "/purchases/analytics",
      },
      {
        id: "suppliers",
        label: "Suivi Fournisseurs",
        icon: Truck,
        path: "/purchases/suppliers",
      },
      {
        id: "categories",
        label: "Dépenses par Catégorie",
        icon: Tags,
        path: "/purchases/categories",
      },
      {
        id: "budget-tracking",
        label: "Suivi Budgétaire",
        icon: Wallet,
        path: "/purchases/budget",
      },
      {
        id: "cost-reduction",
        label: "Optimisation Coûts",
        icon: TrendingDown, 
        path: "/purchases/optimizations",
      }
    ],
  },
];