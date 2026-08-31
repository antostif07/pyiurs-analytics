"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { SoldLocation } from "../_lib/types";

interface Props {
    locations?: SoldLocation[] | string | unknown;
}

export const SoldLocationsBadges = React.memo(function SoldLocationsBadges({ locations }: Props) {
    // 1. Normalisation défensive : S'assure que parsedLocations est un VRAI tableau JS
    let parsedLocations: SoldLocation[] = [];

    if (Array.isArray(locations)) {
        parsedLocations = locations as SoldLocation[];
    } else if (typeof locations === "string" && locations.trim().length > 0) {
        try {
            const parsed = JSON.parse(locations);
            if (Array.isArray(parsed)) {
                parsedLocations = parsed;
            } else if (parsed && typeof parsed === "object") {
                parsedLocations = [parsed as SoldLocation];
            }
        } catch {
            parsedLocations = [];
        }
    } else if (locations && typeof locations === "object" && locations !== null) {
        parsedLocations = [locations as SoldLocation];
    }

    // 2. Si le tableau est vide ou non valide, affichage du tiré
    if (!parsedLocations || parsedLocations.length === 0) {
        return <span className="text-muted-foreground/40 text-[10px]">—</span>;
    }

    // 3. Rendu sécurisé
    return (
        <div className="flex flex-wrap gap-1">
            {parsedLocations.map((loc, idx) => (
                <Badge
                    key={loc?.id ?? idx}
                    className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[9px] font-mono"
                >
                    [{loc?.id ?? "?"}] {loc?.name ?? "Emplacement Inconnu"}
                </Badge>
            ))}
        </div>
    );
});