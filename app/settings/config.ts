// app/settings/config.ts
import { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import { Store, MapPin, Users, Settings2 } from "lucide-react";

export const SETTINGS_NAV_GROUPS: NavGroup[] = [
    {
        id: "reference",
        title: "Référentiels",
        items: [
            {
                id: "shops",
                label: "Boutiques",
                icon: Store,
                path: "/settings/shops",
            },
            {
                id: "odoo-locations",
                label: "Emplacements Odoo",
                icon: MapPin,
                path: "/settings/odoo-locations",
            },
        ],
    },
    {
        id: "system",
        title: "Système",
        items: [
            {
                id: "users",
                label: "Utilisateurs",
                icon: Users,
                path: "/users",
            },
            {
                id: "general",
                label: "Paramètres généraux",
                icon: Settings2,
                path: "/settings/general",
            },
        ],
    },
];

export const SETTINGS_BASE_PATH = "/settings" as const;