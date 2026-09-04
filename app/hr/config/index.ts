import { UserRole } from "@/lib/constants";
import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Contact,
  CalendarClock,
  Clock4,
  CalendarOff,
  Banknote,
  FileSpreadsheet,
  BadgeCent,
  BriefcaseBusiness,
  FileSignature,
  Settings2,
  Building,
  GraduationCap
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  roles?: UserRole[];
  badge?: string | number;
  badgeVariant?: 'default' | 'emerald' | 'amber' | 'rose';
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Pilotage RH",
    items: [
      {
        id: "hr-dashboard",
        label: "Tableau de Bord",
        icon: LayoutDashboard,
        path: "/hr",
        roles: ["admin", "manager", "financier"],
      },
    ],
  },
  {
    id: "employees",
    title: "Gestion des Agents",
    items: [
      {
        id: "directory",
        label: "Annuaire Employés",
        icon: Users,
        path: "/hr/employees",
        roles: ["admin", "manager", "financier", "user"],
      },
      {
        id: "org-chart",
        label: "Organigramme",
        icon: Contact,
        path: "/hr/organization",
        roles: ["admin", "manager", "financier", "user"],
      },
      {
        id: "contracts",
        label: "Contrats & Avenants",
        icon: FileSignature,
        path: "/hr/contracts",
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    id: "time-attendance",
    title: "Temps & Présences",
    items: [
      {
        id: "attendance",
        label: "Pointages (Présences)",
        icon: Clock4,
        path: "/hr/attendance",
        roles: ["admin", "manager", "user"],
      },
      {
        id: "schedules",
        label: "Plannings & Horaires",
        icon: CalendarClock,
        path: "/hr/schedules",
        roles: ["admin", "manager", "user"],
      },
      {
        id: "leaves",
        label: "Demandes de Congés",
        icon: CalendarOff,
        path: "/hr/leaves",
        roles: ["admin", "manager", "user"],
      },
    ],
  },
  {
    id: "payroll",
    title: "Paie & Rémunération",
    items: [
      {
        id: "payroll-prep",
        label: "Préparation de la Paie",
        icon: FileSpreadsheet,
        path: "/hr/payroll/preparation",
        // Ouvert au financier pour la validation des déductions & clôture
        roles: ["admin", "manager", "financier"],
      },
      {
        id: "payslips",
        label: "Fiches de Paie",
        icon: Banknote,
        path: "/hr/payroll/payslips",
        // Accessible à tous (le vendeur ne verra que son propre bulletin via RLS)
        roles: ["admin", "manager", "financier", "user"],
      },
      {
        id: "bonuses-loans",
        label: "Primes & Avances",
        icon: BadgeCent,
        path: "/hr/payroll/bonuses",
        // Autorisation financière pour l'accord des avances sur salaire
        roles: ["admin", "manager", "financier"],
      },
    ],
  },
  {
    id: "development",
    title: "Développement",
    items: [
      {
        id: "recruitment",
        label: "Recrutement",
        icon: BriefcaseBusiness,
        path: "/hr/recruitment",
        roles: ["admin", "manager"],
      },
      {
        id: "training",
        label: "Formations",
        icon: GraduationCap,
        path: "/hr/training",
        roles: ["admin", "manager", "user"],
      },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    items: [
      {
        id: "departments",
        label: "Départements & Postes",
        icon: Building,
        path: "/hr/settings/departments",
        roles: ["admin"],
      },
      {
        id: "hr-settings",
        label: "Paramètres RH & Odoo",
        icon: Settings2,
        path: "/hr/settings",
        roles: ["admin"],
      },
    ],
  },
];