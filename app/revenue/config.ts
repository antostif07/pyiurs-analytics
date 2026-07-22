import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  Banknote,
  Wallet,
  TrendingUp,
  Building2,
  ShoppingBag,
  Sparkles,
  Baby,
  Layers,
  Users,
  Store,
} from "lucide-react";

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Synthèse Globale",
    items: [
      {
        id: "dashboard",
        label: "Vue d'ensemble",
        icon: Banknote,
        path: "/revenue",
        roles: ["admin", "manager", "financier"], // Restreint aux profils stratégiques
      },
      {
        id: "arpu",
        label: "ARPU & Segments",
        icon: Wallet,
        path: "/revenue/arpu",
      },
      {
        id: "retail-kpis",
        label: "Panier Moyen & KPIs",
        icon: ShoppingBag,
        path: "/revenue/kpis",
        roles: ["admin", "manager", "financier"],
      }
    ],
  },
  {
    id: "segment-analysis",
    title: "Analyse par Segment",
    items: [
      {
        id: "performance-femme",
        label: "Performance Femme",
        icon: Layers, // Évoque la superposition de vêtements / prêt-à-porter
        path: "/revenue/performance-femme",
        roles: ["admin", "manager", "financier", "user"], // Accessible aux vendeurs concernés
      },
      {
        id: "performance-enfant",
        label: "Performance Enfant",
        icon: Baby, // ✅ NOUVEAU : Alignement sur votre segment Mode Kids
        path: "/revenue/performance-enfant",
        roles: ["admin", "manager", "financier", "user"],
      },
      {
        id: "performance-beauty",
        label: "Performance Beauté",
        icon: Sparkles, // Évoque l'esthétique et le soin cosmétique
        path: "/revenue/performance-beauty",
        roles: ["admin", "manager", "financier", "user"],
      },
      {
        id: "performance-polog",
        label: "Performance POLOG",
        icon: TrendingUp,
        path: "/revenue/performance-polog"
      },
    ],
  },
  {
    id: "channels-staff",
    title: "Boutiques & Équipes",
    items: [
      {
        id: "performance-stores",
        label: "Ventes par Boutique",
        icon: Store,
        path: "/revenue/performance-stores",
        roles: ["admin", "manager", "financier"],
      },
      {
        id: "performance-associates",
        label: "Ventes par Conseiller",
        icon: Users, // Évoque l'équipe de vente en boutique
        path: "/revenue/performance-associates",
        roles: ["admin", "manager", "financier"], // Strictement pour le calcul des commissions
      }
    ],
  },
  {
    id: "partners",
    title: "Analyse Partenaires",
    items: [
      {
        id: "performance-suppliers",
        label: "Rentabilité Fournisseurs",
        icon: Building2,
        path: "/revenue/performance-suppliers",
        roles: ["admin", "manager", "financier"],
      }
    ],
  },
];