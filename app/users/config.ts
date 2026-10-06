// app/users/config.ts
import {
    Users,
    Database,
    FileSpreadsheet,
    Settings2,
    ShieldCheck,
} from "lucide-react";
import type { NavGroup } from "@/components/new-ui/layout/app-sidebar";

/**
 * Navigation du module Administration.
 * Centralise les pages réservées au rôle admin.
 */
export const USERS_NAV_GROUPS: NavGroup[] = [
    {
        id: "admin",
        title: "Administration",
        items: [
            {
                id: "users",
                label: "Utilisateurs",
                icon: Users,
                path: "/users",
            },
            {
                id: "roles",
                label: "Rôles & Permissions",
                icon: ShieldCheck,
                path: "/users/roles",
            },
            {
                id: "base-test-odoo",
                label: "Base Test Odoo",
                icon: Database,
                path: "/base-test-odoo",
            },
            {
                id: "drive",
                label: "Gestion Drive",
                icon: FileSpreadsheet,
                path: "/gestion-drive",
            },
            {
                id: "settings",
                label: "Paramètres",
                icon: Settings2,
                path: "/settings",
            },
        ],
    },
];

export const USERS_BASE_PATH = "/users" as const;