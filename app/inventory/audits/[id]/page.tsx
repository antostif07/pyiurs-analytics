import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuditScannerClient } from "./audit-scanner-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    const { data: audit } = await supabase
        .from("stock_audits")
        .select("reference")
        .eq("id", id)
        .single();

    return {
        title: `Audit ${audit?.reference || id} | Pyiurs Analytics`,
        description: "Comptage unitaire et contrôle de la démarque.",
    };
}

export default async function AuditDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Chargement en parallèle de la session d'audit et des articles scannés
    const [{ data: audit }, { data: items }] = await Promise.all([
        supabase.from("stock_audits").select("*").eq("id", id).single(),
        supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", id)
            .order("scanned_at", { ascending: false })
    ]);

    if (!audit) {
        notFound();
    }

    return <AuditScannerClient audit={audit} initialItems={items || []} />;
}