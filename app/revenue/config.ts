// app/revenue/config.ts
import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  Banknote,
  Wallet,
  TrendingUp,
  Building2,
  Sparkles,
  Baby,
  Layers,
  Users,
  Store,
  Target,
  Calculator,
  History,
} from "lucide-react";
import type { UserRole } from "@/lib/constants";

/** Rôles full access (exclut explicitement controller) */
const FULL: UserRole[] = ["admin", "manager", "financier"];
/** Accès incluant les vendeurs */
const WITH_USER: UserRole[] = ["admin", "manager", "financier", "user"];

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
        roles: FULL,
      },
      {
        id: "arpu",
        label: "ARPU & Segments",
        icon: Wallet,
        path: "/revenue/arpu",
        roles: FULL,
      },
      {
        id: "budgets-management",
        label: "Gestion des Budgets",
        icon: Target,
        path: "/revenue/budgets",
        roles: FULL,
      },
    ],
  },
  {
    id: "segment-analysis",
    title: "Analyse par Segment",
    items: [
      {
        id: "performance-femme",
        label: "Performance Femme",
        icon: Layers,
        path: "/revenue/performance-femme",
        roles: WITH_USER,
      },
      {
        id: "performance-enfant",
        label: "Performance Enfant",
        icon: Baby,
        path: "/revenue/performance-enfant",
        roles: WITH_USER,
      },
      {
        id: "performance-beauty",
        label: "Performance Beauté",
        icon: Sparkles,
        path: "/revenue/performance-beauty",
        roles: WITH_USER,
      },
      {
        id: "performance-polog",
        label: "Performance POLOG",
        icon: TrendingUp,
        path: "/revenue/performance-polog",
        roles: FULL, // ⬅️ explicite maintenant
      },
    ],
  },
  {
    id: "cash-closing",
    title: "Ventes & Clôtures",
    items: [
      {
        id: "cloture-vente",
        label: "Clôture des Ventes",
        icon: Calculator,
        path: "/revenue/cloture-vente",
        roles: FULL,
      },
      {
        id: "cloture-historique",
        label: "Historique Clôtures",
        icon: History,
        path: "/revenue/cloture-vente/historique",
        roles: FULL,
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
        roles: FULL,
      },
      {
        id: "performance-associates",
        label: "Ventes par Conseiller",
        icon: Users,
        path: "/revenue/performance-associates",
        roles: FULL,
      },
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
        roles: FULL,
      },
    ],
  },
];