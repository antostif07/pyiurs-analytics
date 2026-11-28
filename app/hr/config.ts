import type { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import type { UserRole } from "@/lib/constants";
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
    GraduationCap,
} from "lucide-react";

const ALL_HR: UserRole[] = [
    "admin",
    "financier",
    "manager",
    "user",
    "inventory-manager",
    "inventory_manager",
];
const MANAGEMENT_AND_FINANCE: UserRole[] = ["admin", "manager", "financier"];
const MANAGEMENT_ONLY: UserRole[] = ["admin", "manager"];
const ADMIN_ONLY: UserRole[] = ["admin"];

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
                roles: ALL_HR,
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
                roles: ALL_HR,
            },
            {
                id: "org-chart",
                label: "Organigramme",
                icon: Contact,
                path: "/hr/organization",
                roles: ALL_HR,
            },
            {
                id: "contracts",
                label: "Contrats & Avenants",
                icon: FileSignature,
                path: "/hr/contracts",
                roles: MANAGEMENT_ONLY,
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
                roles: ALL_HR,
            },
            {
                id: "schedules",
                label: "Plannings & Horaires",
                icon: CalendarClock,
                path: "/hr/schedules",
                roles: ALL_HR,
            },
            {
                id: "leaves",
                label: "Demandes de Congés",
                icon: CalendarOff,
                path: "/hr/leaves",
                roles: ALL_HR,
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
                roles: MANAGEMENT_AND_FINANCE,
            },
            {
                id: "payslips",
                label: "Fiches de Paie",
                icon: Banknote,
                path: "/hr/payroll/payslips",
                roles: ALL_HR,
            },
            {
                id: "bonuses-loans",
                label: "Primes & Avances",
                icon: BadgeCent,
                path: "/hr/payroll/bonuses",
                roles: MANAGEMENT_AND_FINANCE,
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
                roles: MANAGEMENT_ONLY,
            },
            {
                id: "training",
                label: "Formations",
                icon: GraduationCap,
                path: "/hr/training",
                roles: ALL_HR,
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
                roles: ADMIN_ONLY,
            },
            {
                id: "hr-settings",
                label: "Paramètres RH & Odoo",
                icon: Settings2,
                path: "/hr/settings",
                roles: ADMIN_ONLY,
            },
        ],
    },
];