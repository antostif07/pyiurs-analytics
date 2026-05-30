import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  Banknote,
  Wallet,
  TrendingUp,
  Building2,
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Principale",
    items: [
      {
        id: "dashboard",
        label: "Vue d\'ensemble",
        icon: Banknote,
        path: "/revenue",
        // badge: "Live", // Pour indiquer le temps réel
      },
      {
        id: "arpu",
        label: "ARPU & Segments",
        icon: Wallet,
        path: "/revenue/arpu",
      }
    ],
  },
  {
    id: "revenue-analysis",
    title: "Analyse des Revenus",
    items: [
      {
        id: "trend-beauty",
        label: "Performance Beauty",
        icon: TrendingUp,
        path: "/revenue/performance-beauty",
      },
      {
        id: "trend-femme",
        label: "Performance Femme",
        icon: TrendingUp,
        path: "/revenue/performance-femme",
      },
      {
        id: "trend-polog",
        label: "Performance POLOG",
        icon: TrendingUp,
        path: "/revenue/performance-polog"
      },
      {
        id: "trend-suppliers",
        label: "Performance Fournisseurs",
        icon: Building2, 
        path: "/revenue/performance-suppliers",
      }
    ],
  },
];