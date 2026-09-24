import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSoldElsewhereAnalysisAction } from "../../_lib/sold-elsewhere-actions";
import { SoldElsewhereClient } from "./sold-elsewhere-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function SoldElsewherePage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const result = await getSoldElsewhereAnalysisAction(id);

    if (!result.success) {
        return (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
                <h1 className="text-base font-semibold text-rose-600">
                    Erreur d&apos;analyse
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {result.error}
                </p>
                <Link
                    href={`/inventory/audits/${id}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-muted"
                >
                    <ArrowLeft className="size-4" />
                    Retour à l&apos;audit
                </Link>
            </div>
        );
    }

    return <SoldElsewhereClient analysis={result.analysis} auditId={id} />;
}