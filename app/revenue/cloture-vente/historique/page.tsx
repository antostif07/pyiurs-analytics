import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isRevenueRole } from "@/lib/auth/roles";
import { fetchCloturesHistory } from "../_lib/server/cloture-service";
import HistoriqueClient from "./historique-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Historique Clôtures",
    description: "Consultation des clôtures de caisse enregistrées.",
};

export default async function HistoriqueCloturesPage() {
    const auth = await getServerAuth();
    if (!auth.user) redirect("/login?next=/revenue/cloture-vente/historique");
    if (!auth.profile || !isRevenueRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const clotures = await fetchCloturesHistory(auth.profile);
    return <HistoriqueClient clotures={clotures} />;
}