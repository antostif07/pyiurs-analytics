// app/settings/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isSettingsRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
    title: {
        default: "Paramètres | Pyiurs",
        template: "%s | Paramètres",
    },
    description:
        "Configuration de l'application : rôles, permissions, modules et préférences.",
    robots: { index: false, follow: false },
};

// Session-dépendant → jamais statique.
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

    // 1. Auth obligatoire
    if (!auth.user) {
        const next = await resolveCurrentPath();
        redirect(`/login?next=${encodeURIComponent(next)}`);
    }

    // 2. Profil obligatoire
    if (!auth.profile) {
        redirect("/unauthorized?reason=missing_profile");
    }

    // 3. Admin strict
    if (!isSettingsRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    return <>{children}</>;
}