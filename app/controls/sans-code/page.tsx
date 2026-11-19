import { Suspense } from "react";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import {
    parseSansCodeFilters,
    serializeSansCodeFilters,
} from "./_lib/filters";
import { fetchSansCodeReport } from "./_lib/server/sans-code-service";
import SansCodeClient from "./sans-code-client";
import { redirect } from "next/navigation";
import { isControlsRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ventes sans code",
    description: "Suivi et contrôle des ventes POS sans code-barres (SCBTY / SCVF142).",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function SansCodeLoader({ searchParams }: PageProps) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) {
        redirect("/login?next=/controls/sans-code");
    }
    if (!auth.profile || !isControlsRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parseSansCodeFilters(rawParams);
    const queryKeyString = serializeSansCodeFilters(filters).toString();
    const initialData = await fetchSansCodeReport(filters, auth.profile);

    return (
        <SansCodeClient
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
        />
    );
}

export default function SansCodePage({ searchParams }: PageProps) {
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
            <SansCodeLoader searchParams={searchParams} />
        </Suspense>
    );
}