// lib/odoo.ts
import { Odoo } from "@rlizana/odoo-rpc";

let odoo: Odoo | null = null;

export async function getOdoo() {
  if (!odoo) {
    odoo = new Odoo("http://pyiurs.odoo.com", "pyiurs");
    await odoo.login("arnold.bopeto@pyiurs.com", process.env.ODOO_PASSWORD!); // ⚠️ mets ton vrai mot de passe
  }
  return odoo;
}

export async function fetchFromOdoo(
  model: string,
  fields: string[] = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  domain: any[] = []
) {
  try {
    const odoo = await getOdoo();
    
    // search_read = filtre (domain) + fields
    const records = await odoo.env(model).search(domain)
        .read([...fields])
    ;

    return { success: true, records };
  } catch (error: unknown) {
    console.error(`Erreur Odoo (${model}):`, error);
    return { 
      success: false, 
      error: typeof error === "object" && error !== null && "message" in error 
        ? (error as { message: string }).message 
        : String(error) 
    };
  }
}