import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import CeoReportShell from "./ceo-report-shell";

export const metadata: Metadata = {
    title: "Rapport DG",
    description:
        "Tableau de bord stratégique consolidé : stock, ventes, finance, opérations et RH.",
};

// Le module dépend de la session → toujours dynamique
export const dynamic = "force-dynamic";

export default async function DgReportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const auth = await getServerAuth();

    // 1. Garde d'authentification
    if (!auth?.user) {
        redirect("/login");
    }

    // 2. Garde de rôle — accès réservé à la direction
    const role = auth.profile?.role;
    const allowedRoles = ["admin", "manager"];
    if (!role || !allowedRoles.includes(role)) {
        redirect("/");
    }

    // 3. Délégation au shell client avec les données serveur
    return (
        <CeoReportShell
            user={{ email: auth.user.email ?? "" }}
            profile={{
                full_name: auth.profile?.full_name ?? null,
                role: role,
            }}
        >
            {children}
        </CeoReportShell>
    );
}