import { ControlStockBeautyModel } from "@/app/types/ControlStockBeautyModel";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const data = await getControlStockData()

    return NextResponse.json({
        success: data
    });
}

async function getControlStockData(): Promise<{
  data: ControlStockBeautyModel[];
  brands: string[];
  colors: string[];
}> {
    // recueperer tous les bon d'achats des fournisseurs beauty
    const poDomain = JSON.stringify([
        ['partner_id.name', 'ilike', 'P.BTY']
    ]) 
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order?fields=id&domain=${poDomain}`,
        { 
        next: { 
            revalidate: 300
        } 
        }
    );

    if (!res.ok) {
        throw new Error("Erreur API Odoo - Commandes d'achat");
    }

    const po = await res.json()
    console.log(po.recordsz);

    return {
        data: [],
        brands: [],
        colors: [],
    }
}