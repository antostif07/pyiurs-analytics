import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/supabase/server";
import { isInventoryRole } from "@/lib/auth/roles";
import MediaManagerPage from "./media-manager-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Gestion des Médias | Stock",
    description: "Gestion des galeries d'images et upload multiple sur le serveur FTP Odoo.",
};

export default async function InventoryMediasPage() {
    const auth = await getServerAuth();

    if (!auth.user) {
        redirect("/login?next=/inventory/medias");
    }
    if (!auth.profile || !isInventoryRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    return <MediaManagerPage />;
}