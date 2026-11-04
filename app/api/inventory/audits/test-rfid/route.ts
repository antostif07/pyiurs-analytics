// app/api/inventory/audits/_test-rfid/route.ts
import { NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";

export const dynamic = "force-dynamic";

export async function GET() {
    // 1. Test sur product.product
    let productResult: unknown = null;
    let productError: string | null = null;
    try {
        productResult = await odooClient.searchRead("product.product", {
            domain: [["active", "=", true]],
            fields: ["id", "name", "x_studio_rfid"],
            limit: 5,
        });
    } catch (e) {
        productError = e instanceof Error ? e.message : String(e);
    }

    // 2. Test sur product.template (au cas où)
    let templateResult: unknown = null;
    let templateError: string | null = null;
    try {
        templateResult = await odooClient.searchRead("product.template", {
            domain: [["active", "=", true]],
            fields: ["id", "name", "x_studio_rfid"],
            limit: 5,
        });
    } catch (e) {
        templateError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
        product_product: { result: productResult, error: productError },
        product_template: { result: templateResult, error: templateError },
    });
}