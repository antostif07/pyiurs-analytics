import { OdooDomain } from "@/lib/odoo/odoo-json2-client";

type LocationField = "location_id" | "location_dest_id";

/**
 * Construit un fragment de domaine Odoo pour filtrer les lignes par :
 * - company_id ∈ companies
 * - ET la location (location_id ou location_dest_id) doit être :
 *     • child_of les locations configurées pour cette company, OU
 *     • usage = "internal" si la company n'a AUCUNE location configurée
 *
 * Gère les 3 cas :
 *   1. Toutes les companies ont des locations → flat AND
 *   2. Aucune company n'a de locations → flat AND (usage=internal)
 *   3. Mixte → OR entre les deux branches
 */
export function buildCompanyLocationDomain(
    companies: number[],
    locationsByCompany: Map<number, number[]>,
    locationField: LocationField,
): OdooDomain {
    if (companies.length === 0) {
        return [[locationField, "=", -1]];
    }

    const withLocations: number[] = [];
    const withoutLocations: number[] = [];
    const locationIdsSet = new Set<number>();

    for (const cId of companies) {
        const locs = locationsByCompany.get(cId) ?? [];
        if (locs.length > 0) {
            withLocations.push(cId);
            for (const l of locs) locationIdsSet.add(l);
        } else {
            withoutLocations.push(cId);
        }
    }

    const locationIdsArr = Array.from(locationIdsSet);
    // ⬇️ FIX : dot-notation pour accéder au champ `usage` d'une many2one
    const usageField = `${locationField}.usage`;

    // Cas 1 : toutes les companies ont des locations
    if (withLocations.length > 0 && withoutLocations.length === 0) {
        return [
            ["company_id", "in", withLocations],
            [locationField, "child_of", locationIdsArr],
        ];
    }

    // Cas 2 : aucune company n'a de locations
    if (withLocations.length === 0 && withoutLocations.length > 0) {
        return [
            ["company_id", "in", withoutLocations],
            [usageField, "=", "internal"],   // ⬅️ FIX (3 elements)
        ];
    }

    // Cas 3 : mixte → OR
    return [
        "|",
        "&",
        ["company_id", "in", withLocations],
        [locationField, "child_of", locationIdsArr],
        "&",
        ["company_id", "in", withoutLocations],
        [usageField, "=", "internal"],       // ⬅️ FIX (3 elements)
    ];
}