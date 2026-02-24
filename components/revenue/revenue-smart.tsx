import { odooClient } from "@/lib/odoo/xmlrpc";
import { RevenueSmartFilter } from "./revenue-smart-filter";

async function fetchData({ segment }: { segment?: string }) {
    let categoryDomain: any[] = [
        ['complete_name', 'ilike', ' / '] // On ne prend que les catégories avec une hiérarchie
    ];
    if (segment) {
        categoryDomain.push(['x_studio_segment_1', '=', segment]);
    }
    const [categories, colors] = await Promise.all([
        odooClient.searchRead('product.category', {
            domain: categoryDomain,
            fields: ['id', 'name'],
        }),
        odooClient.searchRead('product.attribute.value', {
            domain: [['attribute_id.name', '=', 'x_couleur']],
            fields: ['id', 'name']
        })
    ]);
    return { categories, colors };
}

function dataToOptions(data: any[], labelField = 'name'): { value: string, label: string }[] {
    return data.map(item => {
        const rawLabel = item[labelField] || "";
        
        // LOGIQUE DE NETTOYAGE : 
        // On prend "Beauty / SkinCare / Spray" -> on split par "/" -> on prend le dernier élément -> on trim
        const cleanLabel = rawLabel.includes('/') 
            ? rawLabel.split('/').pop()?.trim() 
            : rawLabel;

        return {
            value: String(item.id),
            label: cleanLabel || "Sans nom"
        };
    });
}

async function fetchDataFormatted(segment?: string) {
    const { categories, colors } = await fetchData({segment});
    return {
        categories: dataToOptions(categories as any[]),
        colors: dataToOptions(colors as any[])
    };
}

export default async function RevenueSmart({segment}: { segment?: string }) {
    const { categories, colors } = await fetchDataFormatted(segment);
    
    return (
        <RevenueSmartFilter categories={categories} colors={colors} />
    );
}