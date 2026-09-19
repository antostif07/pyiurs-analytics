import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import CeoReportShell from "./ceo-report-shell";

export const metadata: Metadata = {
    title: {
        default: "Rapport DG | Direction Générale",
        template: "%s | Rapport DG",
    },
    description:
        "Tableau de bord stratégique consolidé : stock, ventes, finance, opérations et RH.",
    robots: {
        index: false,
        follow: false,
    },
};

// Layout dynamique : dépend impérativement de la session et des permissions
export const dynamic = "force-dynamic";

/**
 * Rôles strictement autorisés à consulter les métriques exécutives et consolidées.
 * Note de gouvernance : Ajuster selon la nomenclature exacte de votre table auth/profils.
 */
const ALLOWED_EXECUTIVE_ROLES = ["admin", "ceo", "dg", "director", "cfo", "manager"] as const;
type AllowedRole = (typeof ALLOWED_EXECUTIVE_ROLES)[number];

export default async function CeoReportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const auth = await getServerAuth();

    // 1. Garde d'authentification (avec préservation de l'URL cible)
    if (!auth?.user) {
        redirect("/login?next=/ceo-report");
    }

    // 2. Garde de rôle stricte
    const userRole = auth.profile?.role as AllowedRole | undefined;

    if (!userRole || !ALLOWED_EXECUTIVE_ROLES.includes(userRole)) {
        // Redirection vers une route d'accès refusé ou accueil avec indicateur
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    // 3. Injection sécurisée des informations de session vers le Shell Client
    return (
        <CeoReportShell
            user={{
                id: auth.user.id,
                email: auth.user.email ?? "",
            }}
            profile={{
                full_name: auth.profile?.full_name ?? "Direction Générale",
                role: userRole,
                avatar_url: auth.profile?.avatar_url ?? null,
            }}
        >
            {children}
        </CeoReportShell>
    );
}