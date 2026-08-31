import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuditScannerClient } from "./audit-scanner-client";
import { StockAudit, StockAuditItem } from "../_lib/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

/**
 * Génération dynamique des métadonnées SEO / En-tête
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    const { data: audit } = await supabase
        .from("stock_audits")
        .select("reference, shop_name")
        .eq("id", id)
        .maybeSingle();

    if (!audit) {
        return {
            title: "Audit Introuvable | Retail Intelligence",
        };
    }

    return {
        title: `Audit ${audit.reference} - ${audit.shop_name} | Retail Intelligence`,
        description: "Interface de comptage au scanner et gestion de la démarque.",
    };
}

/**
 * HELPER HAUTE PERFORMANCE & DÉTERMINISTE
 * Récupère 100% des articles du snapshot sans doublons ni omissions
 */
async function fetchAllAuditItemsOptimized(
    supabase: Awaited<ReturnType<typeof createClient>>,
    auditId: string
): Promise<StockAuditItem[]> {
    try {
        const pageSize = 1000;

        // 1. Récupération du décompte exact
        const { count, error: countError } = await supabase
            .from("stock_audit_items")
            .select("id", { count: "exact", head: true })
            .eq("audit_id", auditId);

        if (countError || !count || count === 0) {
            return [];
        }

        // 2. Si moins de 1 000 articles : Fetch unique direct avec tri déterministe
        if (count <= pageSize) {
            const { data } = await supabase
                .from("stock_audit_items")
                .select("*")
                .eq("audit_id", auditId)
                .order("scanned_at", { ascending: false, nullsFirst: false })
                .order("internal_barcode", { ascending: true });

            return (data as StockAuditItem[]) || [];
        }

        // 3. Si plus de 1 000 articles : Execution en parallèle avec TRI SQL COMPOSÉ DÉTERMINISTE
        const totalPages = Math.ceil(count / pageSize);
        const pagePromises = Array.from({ length: totalPages }, (_, pageIndex) => {
            const from = pageIndex * pageSize;
            const to = from + pageSize - 1;

            return supabase
                .from("stock_audit_items")
                .select("*")
                .eq("audit_id", auditId)
                .order("scanned_at", { ascending: false, nullsFirst: false })
                .order("internal_barcode", { ascending: true }) // Deuxième clé de tri pour éviter le mélange des NULLs
                .range(from, to);
        });

        const results = await Promise.all(pagePromises);

        // 4. Dédoublonnage de sécurité par ID pour garantir zéro doublon React
        const itemMap = new Map<string, StockAuditItem>();

        for (const res of results) {
            if (res.data) {
                for (const item of res.data as StockAuditItem[]) {
                    if (!itemMap.has(item.id)) {
                        itemMap.set(item.id, item);
                    }
                }
            }
        }

        return Array.from(itemMap.values());
    } catch (err) {
        console.error("[FETCH_ALL_AUDIT_ITEMS_ERROR]", err);
        return [];
    }
}

export default async function AuditDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authentification & Sécurité
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 2. Vérification des permissions boutiques de l'utilisateur
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, shop_access_type, assigned_shops")
        .eq("id", user.id)
        .single();

    // 3. Chargement conjoint de l'audit et des articles
    const [{ data: audit }, items] = await Promise.all([
        supabase
            .from("stock_audits")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
        fetchAllAuditItemsOptimized(supabase, id),
    ]);

    // 4. Redirection 404 si l'audit n'existe pas
    if (!audit) {
        notFound();
    }

    // 5. Contrôle d'accès : Vérifier si l'utilisateur a le droit d'accéder à cette boutique
    const isFullAccess = profile?.role === "admin" || profile?.shop_access_type === "all";
    const allowedShops = Array.isArray(profile?.assigned_shops)
        ? (profile.assigned_shops as string[])
        : [];

    if (!isFullAccess && !allowedShops.includes(audit.shop_id)) {
        return (
            <div className="p-8 text-center bg-card border border-border rounded-2xl max-w-md mx-auto mt-12">
                <h3 className="text-base font-bold text-destructive">Accès Restreint</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Vous n'avez pas l'autorisation d'accéder aux audits de la boutique <strong>{audit.shop_name}</strong>.
                </p>
            </div>
        );
    }

    return (
        <AuditScannerClient
            audit={audit as StockAudit}
            initialItems={items}
        />
    );
}