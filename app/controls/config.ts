// app/controls/config.ts
import type { NavGroup } from "@/components/new-ui/layout/app-sidebar";
import type { UserRole } from "@/lib/constants";
import {
    ClipboardCheck,
    Barcode,
    BadgePercent,
} from "lucide-react";

const FULL_CONTROLS_ACCESS: UserRole[] = ["admin", "controller"];
const SANS_CODE_ACCESS: UserRole[] = ["admin", "controller", "manager"];

export const NAV_GROUPS: NavGroup[] = [
    {
        id: "overview",
        title: "Pilotage Contrôles",
        items: [
            {
                id: "controls-dashboard",
                label: "Vue d'ensemble",
                icon: ClipboardCheck,
                path: "/controls",
                roles: FULL_CONTROLS_ACCESS,
            },
        ],
    },
    {
        id: "sales-controls",
        title: "Vente",
        items: [
            {
                id: "controls-no-code",
                label: "Ventes sans code",
                icon: Barcode,
                path: "/controls/sans-code",
                roles: SANS_CODE_ACCESS,
            },
            {
                id: "controls-discount-validation",
                label: "Validation de remise",
                icon: BadgePercent,
                path: "/controls/validation-remise",
                roles: FULL_CONTROLS_ACCESS,
            },
        ],
    },
];