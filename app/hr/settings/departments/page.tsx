import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { fetchDepartmentsAndPositions } from "./_lib/server/departments-service";
import DepartmentsClient from "./departments-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Départements & Postes | RH",
    description: "Configuration de la structure organisationnelle RH.",
};

async function DepartmentsLoader() {
    const auth = await getServerAuth();
    if (!auth.user) redirect("/login?next=/hr/settings/departments");
    if (!auth.profile || auth.profile.role !== "admin") {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const initialData = await fetchDepartmentsAndPositions();
    return <DepartmentsClient initialData={initialData} />;
}

export default function HrDepartmentsPage() {
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
                    <div className="h-72 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <DepartmentsLoader />
        </Suspense>
    );
}