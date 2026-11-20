import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import {
    CONTROLLER_ROLE,
    CONTROLLER_CONTROLS_ALLOWED_PATHS,
    MANAGER_CONTROLS_ALLOWED_PATHS,
    isControlsRole,
    INVENTORY_CONTROLS_ALLOWED_PATHS,
} from "@/lib/auth/roles";
import ControlsShell from "./controls-shell";

export const metadata: Metadata = {
    title: { default: "Contrôles | Pyiurs", template: "%s | Contrôles" },
    description: "Centre de contrôle, validations et audits opérationnels.",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function resolveCurrentPath(): Promise<string> {
    const h = await headers();
    return h.get("x-pathname") ?? "/controls";
}

export default async function ControlsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const auth = await getServerAuth();

    if (!auth.user) {
        const next = await resolveCurrentPath();
        redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    if (!auth.profile) {
        redirect("/unauthorized?reason=missing_profile");
    }

    const { role } = auth.profile;

    if (!isControlsRole(role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const path = await resolveCurrentPath();

    if (role === "inventory-manager" || role === "inventory_manager") {
        if (path === "/controls" || path === "/controls/") {
            redirect("/controls/stock-po");
        }
        const allowed = INVENTORY_CONTROLS_ALLOWED_PATHS.some((p) =>
            path.startsWith(p),
        );
        if (!allowed) {
            redirect("/unauthorized?reason=insufficient_permissions");
        }
    }

    // ─── Scope Manager ────────────────────────────────────────────────────
    if (role === "manager") {
        if (path === "/controls" || path === "/controls/") {
            redirect("/controls/sans-cod");
        }
        const allowed = MANAGER_CONTROLS_ALLOWED_PATHS.some((p) =>
            path.startsWith(p),
        );
        if (!allowed) {
            redirect("/unauthorized?reason=insufficient_permissions");
        }
    }

    // ─── Scope Controller ─────────────────────────────────────────────────
    if (role === CONTROLLER_ROLE) {
        const allowed = CONTROLLER_CONTROLS_ALLOWED_PATHS.some((p) =>
            path.startsWith(p),
        );
        if (!allowed) {
            redirect("/unauthorized?reason=insufficient_permissions");
        }
    }

    return <ControlsShell role={role}>{children}</ControlsShell>;
}