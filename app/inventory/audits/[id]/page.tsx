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
        title: `Audit ${audit?.reference || id} | Retail Intelligence`,
        description: "Comptage unitaire et contrôle de la démarque.",
    };
}

/**
 * HELPER : Récupération de l'intégralité des articles (outrepasse la limite 1000 de Supabase PostgREST)
 */
async function fetchAllAuditItems(supabase: any, auditId: string) {
    let allItems: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .order("scanned_at", { ascending: false })
            .range(from, to);

        if (error || !data || data.length === 0) {
            hasMore = false;
        } else {
            allItems = [...allItems, ...data];
            if (data.length < pageSize) {
                hasMore = false; // Fin des résultats
            } else {
                page++;
            }
        }
    }

    return allItems;
}

export default async function AuditDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Chargement de l'en-tête d'audit et de TOUS les articles par chunks
    const [{ data: audit }, items] = await Promise.all([
        supabase.from("stock_audits").select("*").eq("id", id).single(),
        fetchAllAuditItems(supabase, id), // Récupère 3170 articles sans blocage !
    ]);

    if (!audit) {
        notFound();
    }

    return <AuditScannerClient audit={audit} initialItems={items || []} />;
}