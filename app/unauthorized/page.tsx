// app/unauthorized/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Home, LogIn, ShieldAlert, UserX } from "lucide-react";

import { getServerAuth } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Accès refusé | Pyiurs",
    description: "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
    robots: { index: false, follow: false },
};

interface UnauthorizedPageProps {
    searchParams: Promise<{ reason?: string }>;
}

const REASON_DETAILS: Record<
    string,
    { title: string; description: string; isMissingProfile?: boolean }
> = {
    missing_profile: {
        title: "Profil utilisateur introuvable",
        description:
            "Votre compte est bien authentifié, mais aucun profil applicatif ou rôle n'est encore associé à votre utilisateur. Contactez un administrateur pour activer votre accès.",
        isMissingProfile: true,
    },
    insufficient_permissions: {
        title: "Permissions insuffisantes",
        description:
            "Votre rôle actuel ne vous autorise pas à consulter ce module ou cette section. Si vous pensez qu'il s'agit d'une erreur, demandez l'accès à un administrateur.",
    },
};

export default async function UnauthorizedPage({
    searchParams,
}: UnauthorizedPageProps) {
    const [{ reason }, auth] = await Promise.all([searchParams, getServerAuth()]);

    const info =
        (reason && REASON_DETAILS[reason]) ||
        REASON_DETAILS.insufficient_permissions;

    const Icon = info.isMissingProfile ? UserX : ShieldAlert;

    return (
        <main className="min-h-screen w-full flex items-center justify-center bg-background p-4 antialiased">
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-xl space-y-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Icon className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Badge
                            variant="outline"
                            className="h-5 px-2 text-[10px] font-mono font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60"
                        >
                            HTTP 403
                        </Badge>
                        {auth.profile?.role && (
                            <Badge
                                variant="outline"
                                className="h-5 px-2 text-[10px] font-mono text-muted-foreground"
                            >
                                Rôle : {auth.profile.role}
                            </Badge>
                        )}
                    </div>

                    <h1 className="text-lg font-bold tracking-tight text-foreground">
                        {info.title}
                    </h1>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        {info.description}
                    </p>
                </div>

                {auth.user?.email && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                        Connecté en tant que{" "}
                        <span className="font-semibold text-foreground">
                            {auth.profile?.full_name || auth.user.email}
                        </span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <Button asChild size="sm" className="w-full sm:w-auto h-8 text-xs gap-1.5">
                        <Link href="/">
                            <Home className="w-3.5 h-3.5" />
                            Retour à l&apos;accueil
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto h-8 text-xs gap-1.5"
                    >
                        <Link href="/login">
                            {auth.user ? (
                                <>
                                    <LogIn className="w-3.5 h-3.5" />
                                    Changer de compte
                                </>
                            ) : (
                                <>
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Se connecter
                                </>
                            )}
                        </Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}