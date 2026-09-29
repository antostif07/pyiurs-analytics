// @/lib/auth/scope.ts
import type { Json } from '@/lib/supabase/database.types'

/**
 * assigned_shops est un JSONB contenant des identifiants Odoo de boutiques.
 * Exemple réel : ["1", "13", "17", "19", "14", "9", "11", "15", "21"]
 * ⚠️ Ce ne sont PAS des UUID Supabase — ce sont des shop_id Odoo (strings numériques).
 */
export type OdooShopId = string

/**
 * assigned_companies est un JSONB contenant des identifiants Odoo de sociétés.
 * Exemple réel : [8, 6, 3, 12, 5, 1, 4, 11]
 */
export type OdooCompanyId = number

export function parseAssignedShopIds(json: Json | null): OdooShopId[] {
    if (!Array.isArray(json)) return []
    return json.filter((v): v is string => typeof v === 'string')
}

export function parseAssignedCompanyIds(json: Json | null): OdooCompanyId[] {
    if (!Array.isArray(json)) return []
    return json.filter((v): v is number => typeof v === 'number')
}

export interface UserScope {
    /** Odoo shop ids — PAS des UUID Supabase */
    odooShopIds: OdooShopId[]
    /** Odoo company ids */
    odooCompanyIds: OdooCompanyId[]
    /** 'all' pour admin, 'assigned' pour un scope restreint, 'none' si vide */
    accessType: 'all' | 'assigned' | 'none'
    /** true si l'utilisateur voit tout le groupe sans filtre */
    isGroupWide: boolean
}

export function buildUserScope(
    assignedShops: Json | null,
    assignedCompanies: Json | null,
    _shopAccessType: string | null,
    isGroupWide: boolean,
): UserScope {
    const odooShopIds = parseAssignedShopIds(assignedShops)
    const odooCompanyIds = parseAssignedCompanyIds(assignedCompanies)

    let accessType: UserScope['accessType']
    if (isGroupWide) {
        accessType = 'all'
    } else if (odooShopIds.length > 0 || odooCompanyIds.length > 0) {
        accessType = 'assigned'
    } else {
        accessType = 'none'
    }

    return { odooShopIds, odooCompanyIds, accessType, isGroupWide }
}