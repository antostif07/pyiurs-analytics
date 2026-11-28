import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isHrRole } from "@/lib/auth/hr-roles";
import EmployeeFolderClient from "./employee-folder-client";
import { fetchEmployeeFolder } from "../_lib/server.ts/employee-folder-service";

export const dynamic = "force-dynamic";

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `Dossier Collaborateur | RH`,
    };
}

async function EmployeeFolderLoader({ params }: Props) {
    const [{ id }, auth] = await Promise.all([params, getServerAuth()]);

    if (!auth.user) redirect(`/login?next=/hr/employees/${id}`);
    if (!auth.profile || !isHrRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const data = await fetchEmployeeFolder(id);
    if (!data) notFound();

    return <EmployeeFolderClient data={data} userRole={auth.profile.role ?? "user"} />;
}

export default function EmployeeFolderPage({ params }: Props) {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="h-44 rounded-lg bg-muted/40" />
                    <div className="h-80 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <EmployeeFolderLoader params={params} />
        </Suspense>
    );
}