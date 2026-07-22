"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes"; // Import direct sécurisé pour la v3

/**
 * ThemeProvider
 * 
 * Enveloppe l'application pour fournir la gestion de thèmes (sombre/clair/système)
 * éliminant ainsi les flashes d'hydratation (FOUC).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider {...props}>
            {children}
        </NextThemesProvider>
    );
}