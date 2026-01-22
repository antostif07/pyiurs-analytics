import BeautyBrandsClient from "./control-revenue-beauty.client";
import { POSConfig } from "../types/pos";
import { getBeautyBrandsData, getPOSConfig } from "./actions";

interface PageProps {
  searchParams: Promise<{
    boutique?: string;
    month?: string;
    year?: string;
  }>;
}

export default async function ControlRevenueBeautyPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const boutiqueId = params.boutique;
    const month = params.month;
    const year = params.year;

    // 1. Récupération des données (Parallèle si possible, mais ici séquentiel est OK car Config est rapide)
    // On utilise la nouvelle fonction optimisée
    const beautyData = await getBeautyBrandsData(boutiqueId, month, year);
    
    const posConfigData = await getPOSConfig();
    const boutiques = (posConfigData.records as any[]).map((config: any) => ({
        id: config.id,
        name: config.name
    } as POSConfig));

    return (
        <BeautyBrandsClient 
            initialData={beautyData} 
            boutiques={boutiques}
            selectedBoutiqueId={boutiqueId}
            selectedMonth={month}
            selectedYear={year}
        />
    )
}