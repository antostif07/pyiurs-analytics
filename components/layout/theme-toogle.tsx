"use client";

import * as React from "react";
import { useTheme } from "next-themes"; //

export function ThemeToggle() {
    const { theme, setTheme } = useTheme(); //
    const [mounted, setMounted] = React.useState(false);

    // Évite l'erreur d'hydratation en attendant que le composant soit monté côté client
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Rendu d'un squelette ou d'un bouton vide de même dimension pour préserver le layout lors du chargement
        return <div className="w-9 h-9 rounded-md bg-muted/20 animate-pulse" />;
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Basculer le thème visuel"
        >
            {theme === "dark" ? (
                // Icône Soleil
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                </svg>
            ) : (
                // Icône Lune
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
            )}
        </button>
    );
}