import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
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
      },
      {
        id: "org-chart",
        label: "Organigramme",
        icon: Contact,
        path: "/hr/organization",
      },
      {
        id: "contracts",
        label: "Contrats & Avenants",
        icon: FileSignature,
        path: "/hr/contracts",
        roles: ["Admin", "Manager"],
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
        // badge: "Live", // Utile si on connecte une pointeuse temps réel
      },
      {
        id: "schedules",
        label: "Plannings & Horaires",
        icon: CalendarClock,
        path: "/hr/schedules",
      },
      {
        id: "leaves",
        label: "Demandes de Congés",
        icon: CalendarOff,
        path: "/hr/leaves",
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
        roles: ["Admin", "Manager"],
      },
      {
        id: "payslips",
        label: "Fiches de Paie",
        icon: Banknote,
        path: "/hr/payroll/payslips",
      },
      {
        id: "bonuses-loans",
        label: "Primes & Avances",
        icon: BadgeCent,
        path: "/hr/payroll/bonuses",
        roles: ["Admin", "Manager"],
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
        roles: ["Admin", "Manager"],
      },
      {
        id: "training",
        label: "Formations",
        icon: GraduationCap,
        path: "/hr/training",
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
        roles: ["Admin"],
      },
      {
        id: "hr-settings",
        label: "Paramètres RH & Odoo",
        icon: Settings2,
        path: "/hr/settings",
        roles: ["Admin"],
      },
    ],
  },
];