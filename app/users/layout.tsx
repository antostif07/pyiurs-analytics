// app/users/layout.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import UsersShell from "./users-shell";

export const metadata: Metadata = {
    title: {
        default: "Utilisateurs | Pyiurs",
        template: "%s | Administration",
    },
    description:
        "Gestion des comptes utilisateurs, rôles et permissions.",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function resolveCurrentPath(): Promise<string> {
    const h = await headers();
    return h.get("x-pathname") ?? "/users";
}

export default async function UsersLayout({
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

    // 3. Rôle admin uniquement
    if (auth.profile.role !== "admin") {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    return <UsersShell>{children}</UsersShell>;
}