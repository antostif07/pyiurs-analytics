import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isHrRole } from "@/lib/auth/hr-roles";
import { fetchOrganizationData } from "./_lib/server/org-service";
import OrganizationClient from "./organization-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Organigramme | RH",
    description: "Arbre hiérarchique des agents, départements et postes.",
};

async function OrgLoader() {
    const auth = await getServerAuth();
    if (!auth.user) redirect("/login?next=/hr/organization");
    if (!auth.profile || !isHrRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const data = await fetchOrganizationData();
    return (
        <OrganizationClient
            initialData={data}
            isAdmin={auth.profile.role === "admin"}
        />
    );
}

export default function HrOrganizationPage() {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="h-96 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <OrgLoader />
        </Suspense>
    );
}