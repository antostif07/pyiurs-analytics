import { odooClient, OdooDomain } from "@/lib/odoo/xmlrpc";
import { RevenueSmartFilter } from "./revenue-smart-filter";
import { Option } from "../ui/multiselect";

// --- 1. DÉFINITION DES TYPES ---

export interface FilterOption {
    value: string;
    label: string;
}

interface OdooCategory {
    id: number;
    name: string;
    complete_name?: string;
    x_studio_segment_1?: string; 
}

interface OdooColor {
    id: number;
    x_name: string;
}

// Contrainte de base pour tout enregistrement Odoo formaté
interface BaseOdooRecord {
    id: number | string;
}

interface FetchDataParams {
    segment?: string;
}

interface FilterDataResult {
    categories: Option[];
    colors: Option[];
}

// --- 2. LOGIQUE MÉTIER & APPELS RÉSEAU ---

/**
 * Récupère les données brutes depuis l'ERP Odoo.
 * Implémente une gestion d'erreur (Fail-safe) pour éviter de casser la page 
 * en cas d'indisponibilité du serveur Odoo.
 */
async function fetchData({ segment }: FetchDataParams) {
    try {
        const categoryDomain: OdooDomain =[
            ['complete_name', 'ilike', ' / ']
        ];

        if (segment) {
            categoryDomain.push(['x_studio_segment_1', '=', segment]);
        }

        const[categories, colors] = await Promise.all([
            odooClient.searchRead<OdooCategory>('product.category', {
                domain: categoryDomain,
                fields: ['id', 'name', 'complete_name'],
            }),
            odooClient.searchRead<OdooColor>('x_couleur', {
                domain: [],
                fields: ['id', 'x_name']
            })
        ]);

        return { 
            categories: categories || [], 
            colors: colors ||[] 
        };

    } catch (error) {
        console.error("❌ Odoo RPC Error (fetchData):", error);
        // Fallback gracieux en cas d'erreur de l'ERP
        return { categories: [], colors:[] };
    }
}

// --- 3. UTILITAIRES DE TRANSFORMATION ---

/**
 * Transforme les enregistrements Odoo en options pour le front-end.
 * Le type générique T doit étendre BaseOdooRecord (posséder un 'id').
 */
export function dataToOptions<T extends BaseOdooRecord>(
    data: T[], 
    labelField: keyof T
): Option[] {
    return data.map(item => {
        const rawValue = item[labelField];
        
        // Sécurisation stricte : évite le comportement où String(undefined) renvoie "undefined"
        const rawLabel = rawValue !== null && rawValue !== undefined 
            ? String(rawValue) 
            : "";
        
        // Logique de nettoyage pour les noms hiérarchiques (ex: "Catégorie / Sous-catégorie")
        const cleanLabel = rawLabel.includes('/') 
            ? rawLabel.split('/').pop()?.trim() 
            : rawLabel;

        return {
            value: String(item.id),
            label: cleanLabel || "Sans nom"
        };
    });
}

/**
 * Formate les données Odoo en options utilisables par le composant Filter.
 */
async function fetchDataFormatted(segment?: string): Promise<FilterDataResult> {
    const { categories, colors } = await fetchData({ segment });
    
    return {
        // 'complete_name' est garanti par l'interface OdooCategory
        categories: dataToOptions(categories, 'complete_name'),
        
        // 'x_name' est garanti par l'interface OdooColor
        colors: dataToOptions(colors, 'x_name'),
    };
}

// --- 4. COMPOSANT SERVEUR (UI) ---

interface RevenueSmartProps {
    segment?: string;
}

export default async function RevenueSmart({ segment }: RevenueSmartProps) {
    const { categories, colors } = await fetchDataFormatted(segment);
    
    return (
        <RevenueSmartFilter 
            categories={categories} 
            colors={colors} 
        />
    );
}