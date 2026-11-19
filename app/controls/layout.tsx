import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isControlsRole } from "@/lib/auth/roles";
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

    return <ControlsShell role={role}>{children}</ControlsShell>;
}