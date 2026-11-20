import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isControlsRole } from "@/lib/auth/roles";
import { parseRedsupFilters, serializeRedsupFilters } from "./_lib/filters";
import { fetchRedsupReport } from "./_lib/server/redsup-service";
import ValidationRemiseClient from "./validation-remise-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Validation de remise",
    description: "Contrôle des remises RedSup : preuves manager et validation controller/admin.",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ValidationRemiseLoader({ searchParams }: PageProps) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) redirect("/login?next=/controls/validation-remise");
    if (!auth.profile || !isControlsRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parseRedsupFilters(rawParams);
    const queryKeyString = serializeRedsupFilters(filters).toString();
    const initialData = await fetchRedsupReport(filters, auth.profile);

    return (
        <ValidationRemiseClient
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
            userRole={auth.profile.role ?? "user"}
        />
    );
}

export default function ValidationRemisePage({ searchParams }: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-24 rounded-lg bg-muted/40" />
                        ))}
                    </div>
                    <div className="h-80 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <ValidationRemiseLoader searchParams={searchParams} />
        </Suspense>
    );
}