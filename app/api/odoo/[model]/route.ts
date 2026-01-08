import { fetchFromOdoo } from "@/lib/odoo-client";
import { NextResponse } from "next/server";

export async function GET(req: Request, context: { params: Promise<{ model: string }> }) {
  const { model } = await context.params;
  const { searchParams } = new URL(req.url);
  
  // ?fields=id,name,email
  const fields = searchParams.get("fields")?.split(",") || [];

  // ?domain=[["is_company","=",true]]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let domain: any[] = [];
  const domainParam = searchParams.get("domain");
  if (domainParam) {
    try {
      domain = JSON.parse(domainParam);
    } catch (e) {
        console.log(e);
        
      return NextResponse.json(
        { success: false, error: "Domaine invalide (JSON attendu)" },
        { status: 400 }
      );
    }
  }

  const result = await fetchFromOdoo(model, fields, domain);

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}