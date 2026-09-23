"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AuditError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("[AUDIT_PAGE_ERROR]", error);
    }, [error]);

    return (
        <div
            role="alert"
            className="mx-auto mt-16 flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center"
        >
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="size-6" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
                <h1 className="text-base font-semibold">Chargement impossible</h1>
                <p className="text-sm text-muted-foreground">
                    L&apos;audit n&apos;a pas pu être chargé en entier. Vérifiez votre connexion
                    puis réessayez.
                </p>
                {error.digest && (
                    <p className="text-xs text-muted-foreground">Référence : {error.digest}</p>
                )}
            </div>

            <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <RefreshCw className="size-4" aria-hidden="true" />
                Réessayer
            </button>
        </div>
    );
}