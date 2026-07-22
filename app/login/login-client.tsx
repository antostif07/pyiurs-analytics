"use client";

import { FullScreenLoader } from "@/components/login/full-screen-loader";
import { LoginForm } from "@/components/login/login-form";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Lock } from "lucide-react";

export default function LoginPageClient() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // ✅ Récupération de 'user' depuis le contexte
    const { signIn, user, loading: isAuthInitializing } = useAuth();

    const handleLogin = async (email: string, pass: string) => {
        setIsSubmitting(true);
        setAuthError(null);

        try {
            const { error } = await signIn(email, pass);

            if (error) {
                const message = error.message || '';
                const status = 'status' in error ? (error as { status?: number }).status : undefined;

                if (message.includes('Invalid login credentials')) {
                    setAuthError('Email ou mot de passe incorrect.');
                } else if (message.includes('Too many requests') || status === 429) {
                    setAuthError('Trop de tentatives de connexion échouées. Veuillez patienter quelques minutes.');
                } else {
                    setAuthError(message || 'Une erreur réseau est survenue. Veuillez réessayer.');
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                setAuthError(err.message);
            } else {
                setAuthError('Une erreur inattendue est survenue au niveau du réseau.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * ✅ CORRECTIF DU RENDU :
     * Si l'authentification s'initialise (isAuthInitializing est true)
     * OU si l'utilisateur est déjà authentifié (user n'est pas null),
     * cela signifie que nous sommes soit en train de valider la session, soit en train de rediriger vers le dashboard.
     * On affiche le FullScreenLoader pour masquer le formulaire pendant la transition.
     */
    if (isAuthInitializing || user) {
        return <FullScreenLoader />;
    }

    return (
        <main className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-150">
            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">

                {/* Symbole d'accès minimaliste */}
                <div className="flex justify-center mb-4">
                    <div className="h-10 w-10 border border-border rounded-xl flex items-center justify-center bg-card text-foreground shadow-sm">
                        <Lock className="h-4 w-4 text-primary stroke-[1.5]" />
                    </div>
                </div>

                <h1 className="text-center text-2xl font-semibold tracking-wider uppercase mb-1">
                    Pyiurs Analytics
                </h1>
                <p className="text-center text-xs text-muted-foreground font-light tracking-wide mb-6">
                    Retail Intelligence Platform
                </p>
            </div>

            <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md flex justify-center px-4 sm:px-0">
                <LoginForm
                    onSubmit={handleLogin}
                    isLoading={isSubmitting}
                    error={authError}
                />
            </div>

            {/* Pied de page confidentiel */}
            <div className="mt-12 text-center text-[10px] uppercase tracking-widest text-muted-foreground/60 font-light">
                &copy; {new Date().getFullYear()} Pyiurs. Accès confidentiel restreint.
            </div>
        </main>
    );
}