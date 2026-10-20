// app/settings/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isSettingsRole } from "@/lib/auth/roles";
import SettingsShell from "./settings-shell";

export const metadata: Metadata = {
    title: {
        default: "Configuration | Pyiurs",
        template: "%s | Configuration",
    },
    description:
        "Configuration des boutiques, emplacements Odoo et paramètres système.",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function resolveCurrentPath(): Promise<string> {
    const h = await headers();
    return h.get("x-pathname") ?? "/settings";
}

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const auth = await getServerAuth();

    // 1. Auth
    if (!auth.user) {
        const next = await resolveCurrentPath();
        redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    // 2. Profil obligatoire
    if (!auth.profile) {
        redirect("/unauthorized?reason=missing_profile");
    }

    // 3. Rôle admin
    const { role } = auth.profile;
    if (!isSettingsRole(role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    return <SettingsShell role={role}>{children}</SettingsShell>;
}