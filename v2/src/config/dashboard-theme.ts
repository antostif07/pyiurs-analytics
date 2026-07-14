// src/config/dashboard-theme.ts
import {
  TrendingUp,
  Package,
  Users,
  Megaphone,
  DollarSign,
  Cog,
  Briefcase,
  FileSpreadsheet,
  Truck,
  HeartHandshake,
  Clock,
  ShieldCheck,
  CalendarDays,
  HelpCircle,
} from "lucide-react";
import React from "react";

export type ModuleStatus = "active" | "development";

export interface ModuleStat {
  label: string;
  value: string;
}

export interface ModuleData {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorToken: string;
  accentColor: string;
  href: string;
  stats: ModuleStat[];
  badge: string;
  status: ModuleStatus;
  alertsCount?: number;
}

export interface RoadmapModuleData {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  quarter: string;
}

// Union discriminante stricte pour les indicateurs Odoo (4.2)
export type OdooKPIsResult =
  | {
      success: true;
      annualRevenue: string;
      activeClients: string;
      stockAlertsCount: number;
      lastSyncISO: string; // ISO Timestamp pour la localisation client (1.5)
    }
  | {
      success: false;
      error: string;
      lastSyncISO: null;
    };

// Clé de cache globale
export const ODOO_KPIS_QUERY_KEY = ["odoo-kpis"] as const;

// Configuration centralisée de la Query (3.1)
export const odooKPIsQueryOptions = (fetchFn: () => Promise<OdooKPIsResult>) => ({
  queryKey: ODOO_KPIS_QUERY_KEY,
  queryFn: fetchFn,
  staleTime: 1000 * 60 * 5, // 5 minutes de cache
});

// Liste des modules opérationnels statiques
export const BUSINESS_MODULES: readonly ModuleData[] = [
  {
    id: "stock",
    name: "Stock & Entrepôt",
    description: "Gestion des inventaires Odoo, mouvements physiques et seuils de rupture",
    icon: Package,
    colorToken: "from-emerald-600 to-teal-600",
    accentColor: "#059669",
    href: "/stock",
    stats: [
      { label: "SKUs actifs", value: "1 284" },
      { label: "Alertes", value: "0" },
    ],
    badge: "Stock OK",
    status: "active" as const,
  },
  {
    id: "purchases",
    name: "Achats & Fournisseurs",
    description: "Suivi des demandes de prix, commandes d'achat Odoo et flux de réception",
    icon: Truck,
    colorToken: "from-amber-600 to-orange-600",
    accentColor: "#d97706",
    href: "/purchases",
    stats: [
      { label: "Bons d'achat", value: "14" },
      { label: "Engagé ce mois", value: "12 450 €" },
    ],
    badge: "Actif",
    status: "active" as const,
  },
  {
    id: "revenue",
    name: "Revenue & Analytics",
    description: "Suivi des ventes réelles Odoo, prévisions et chiffre d'affaires consolidé",
    icon: TrendingUp,
    colorToken: "from-violet-600 to-indigo-600",
    accentColor: "#7c3aed",
    href: "/revenue",
    stats: [
      { label: "Ce mois", value: "€248K" },
      { label: "Croissance", value: "+12.4%" },
    ],
    badge: "Bientôt",
    status: "development" as const,
  },
  {
    id: "clients",
    name: "Clients & CRM",
    description: "Segmentation des bases clients, fidélisation et indicateurs de comportement",
    icon: Users,
    colorToken: "from-sky-600 to-blue-600",
    accentColor: "#0284c7",
    href: "/clients",
    stats: [
      { label: "Total clients", value: "18 432" },
      { label: "Nouveaux", value: "+234" },
    ],
    badge: "Bientôt",
    status: "development" as const,
  },
  {
    id: "marketing",
    name: "Marketing & ROI",
    description: "Suivi des campagnes, calcul automatique du ROI et tunnels de conversion",
    icon: Megaphone,
    colorToken: "from-orange-500 to-rose-500",
    accentColor: "#f97316",
    href: "/marketing",
    stats: [
      { label: "Campagnes", value: "14" },
      { label: "ROI moyen", value: "3.2x" },
    ],
    badge: "Bientôt",
    status: "development" as const,
  },
  {
    id: "finance",
    name: "Compta & Finance",
    description: "Trésorerie consolidée, marge nette et budgets opérationnels",
    icon: DollarSign,
    colorToken: "from-amber-500 to-yellow-500",
    accentColor: "#d97706",
    href: "/finance",
    stats: [
      { label: "Trésorerie", value: "€1.2M" },
      { label: "Marge nette", value: "18.7%" },
    ],
    badge: "Bientôt",
    status: "development" as const,
  },
  {
    id: "operations",
    name: "Opérations logistiques",
    description: "Performances de livraison, suivi des SLA équipes et performances",
    icon: Cog,
    colorToken: "from-slate-500 to-gray-600",
    accentColor: "#64748b",
    href: "/operations",
    stats: [
      { label: "Tâches actives", value: "89" },
      { label: "SLA", value: "96.2%" },
    ],
    badge: "Bientôt",
    status: "development" as const,
  },
];

export const ROADMAP_MODULES: readonly RoadmapModuleData[] = [
  { id: "rh", name: "Ressources Humaines", description: "Suivi des temps, congés et organigramme", icon: Briefcase, quarter: "T1 2027" },
  { id: "facturation", name: "Facturation", description: "Émission automatique et suivi des règlements", icon: FileSpreadsheet, quarter: "T1 2027" },
  { id: "purchases", name: "Achats & Fournisseurs", description: "Suivi des demandes de prix, commandes d'achat Odoo et flux de réception", icon: Truck, quarter: "T2 2027" },
  { id: "sav", name: "Service Client", description: "Suivi des tickets de support et satisfaction", icon: HeartHandshake, quarter: "T2 2027" },
  { id: "timesheet", name: "Feuilles de Temps", description: "Suivi des heures facturables sur projets", icon: Clock, quarter: "T3 2027" },
  { id: "plan-6", name: "Production & Usines", description: "Suivi des ordres de fabrication Odoo", icon: Cog, quarter: "T3 2027" },
  { id: "plan-7", name: "Qualité & Normes", description: "Contrôle des procédures et audits", icon: ShieldCheck, quarter: "T4 2027" },
  { id: "plan-8", name: "Projets complexes", description: "Diagrammes de Gantt et tâches pivots", icon: CalendarDays, quarter: "T4 2027" },
  { id: "plan-9", name: "Support Informatique", description: "Assistance technique et bases de connaissances", icon: HelpCircle, quarter: "T4 2027" },
];