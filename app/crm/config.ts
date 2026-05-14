import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import {
  Users,
  UserPlus,
  UserCheck,
  Target,
  RefreshCw,
  Zap,
  MessageSquare,
  History,
  PieChart,
  Settings2,
  UsersRound,
  HeartHandshake,
  Star,
  Activity,
  ListChecks,
  Contact2,
} from "lucide-react";

export const CRM_NAV_GROUPS: NavGroup[] = [
  {
    id: "crm-overview",
    title: "Pilotage Client",
    items: [
      {
        id: "crm-dashboard",
        label: "Tableau de Bord CRM",
        icon: Activity,
        path: "/crm",
      },
    ],
  },
  {
    id: "customer-base",
    title: "Gestion de la Base",
    items: [
      {
        id: "all-customers",
        label: "Annuaire Clients",
        icon: Users,
        path: "/crm/customers",
      },
      {
        id: "segments",
        label: "Segments & Groupes",
        icon: UsersRound,
        path: "/crm/segments",
      },
      {
        id: "client-pool",
        label: "Parc Client (Actifs)",
        icon: Contact2,
        path: "/crm/pool",
      },
    ],
  },
  {
    id: "retention-strategy",
    title: "Fidélisation & Rétention",
    items: [
      {
        id: "recurrence-tracking",
        label: "Suivi de Récurrence",
        icon: RefreshCw, // Icone qui symbolise le cycle de retour
        path: "/crm/retention",
        // C'est ici que vous gérez votre objectif de 80%
      },
      {
        id: "loyalty-program",
        label: "Programme Fidélité",
        icon: Star,
        path: "/crm/loyalty",
      },
      {
        id: "churn-alerts",
        label: "Risques de Perte (Churn)",
        icon: Zap,
        path: "/crm/churn",
      },
    ],
  },
  {
    id: "sales-pipeline",
    title: "Cycle de Vente",
    items: [
      {
        id: "leads",
        label: "Prospects (Leads)",
        icon: UserPlus,
        path: "/crm/leads",
      },
      {
        id: "opportunities",
        label: "Opportunités / Devis",
        icon: Target,
        path: "/crm/opportunities",
      },
    ],
  },
  {
    id: "customer-engagement",
    title: "Engagement & Support",
    items: [
      {
        id: "interactions",
        label: "Historique Échanges",
        icon: History,
        path: "/crm/history",
      },
      {
        id: "tasks-followup",
        label: "Relances & Tâches",
        icon: ListChecks,
        path: "/crm/tasks",
      },
      {
        id: "satisfaction",
        label: "Satisfaction (NPS)",
        icon: HeartHandshake,
        path: "/crm/satisfaction",
      },
    ],
  },
  {
    id: "crm-analytics",
    title: "Rapports & Insights",
    items: [
      {
        id: "acquisition-reports",
        label: "Analyse Acquisition",
        icon: PieChart,
        path: "/crm/reports/acquisition",
      },
      {
        id: "retention-stats",
        label: "Stats de Fidélisation",
        icon: UserCheck,
        path: "/crm/reports/retention",
      },
    ],
  },
  {
    id: "crm-config",
    title: "Configuration",
    items: [
      {
        id: "crm-settings",
        label: "Paramètres CRM",
        icon: Settings2,
        path: "/crm/settings",
        roles: ["admin"],
      },
    ],
  },
];