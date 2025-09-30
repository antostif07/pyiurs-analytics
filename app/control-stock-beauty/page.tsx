import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { POSOrderLine } from "../types/pos";
import { mapOdooProduct, Product } from "../types/product_template";
import { PurchaseOrderLine } from "../types/purchase";
import { controlStockBeautyColumns } from "./columns";
import { DataTable } from "./data-table";

async function getProducts() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,x_studio_many2one_field_21bvh,x_studio_many2one_field_QyelN,x_studio_many2one_field_Arl5D,description_pickingin&domain=[[\"categ_id\",\"ilike\",\"beauty\"]]`,
    { cache: "no-store" } // pour éviter le cache si tu veux toujours des données fraîches
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo");
  }

  return res.json();
}

async function getPurchaseOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,product_id,product_qty,qty_received,price_unit&domain=[["partner_id", "not in", [24099, 23705, 1, 23706, 23707, 23708, 27862]]]`,
    { cache: "no-store" } // pour éviter le cache si tu veux toujours des données fraîches
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo");
  }

  return res.json();
}

async function getPOSOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,qty`,
    { cache: "no-store" } // pour éviter le cache si tu veux toujours des données fraîches
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo");
  }

  return res.json();
}

export default async function ControlStockBeautyPage() {
    const products = await getProducts()  // Récupérer les produits depuis Firebase ou Odoo
    const purchaseOrderLines = await getPurchaseOrderLines()
    const posOrderLines = await getPOSOrderLines()

    console.log(posOrderLines.records[0]);
    

    const data = products.records.map(mapOdooProduct);

    const groupedData: ControlStockBeautyModel[] = [];
    const groupedMap = new Map<string, Product[]>();

    data.forEach((product: Product) => {
        const key = product.hs_code || "UNKNOWN";
        if (!groupedMap.has(key)) groupedMap.set(key, []);
        groupedMap.get(key)!.push(product);
    });

    groupedMap.forEach((productsGroup, hs_code) => {
        const label = productsGroup[0].name;
        const cleanName = label.split("[").shift()?.trim();
        const name = `${cleanName} - ${hs_code} - (${productsGroup[0].listPrice}$)`;

        const relatedLines = purchaseOrderLines.records.filter(
            (line: PurchaseOrderLine) =>
            line.product_id &&
            productsGroup.some((p) => p.productVariantId === line.product_id[0])
        );

        const relatedPosLines = posOrderLines.records.filter(
            (line: POSOrderLine) =>
            line.product_id &&
            productsGroup.some((p) => p.productVariantId === line.product_id[0])
        );

        const product_qty = relatedLines.reduce(
            (sum: number, line: PurchaseOrderLine) => sum + (line.product_qty || 0),
            0
        );
        const qty_received = relatedLines.reduce(
            (sum: number, line: PurchaseOrderLine) => sum + (line.qty_received || 0),
            0
        );
        const not_received = product_qty - qty_received;
        const qty_sold = relatedPosLines.reduce(
            (sum: number, line: POSOrderLine) => sum + (line.qty || 0),
            0
        );
        const qty_available = qty_received - qty_sold;

        groupedData.push({
            hs_code,
            name,
            product_qty,
            qty_received,
            not_received,
            qty_sold,
            qty_available
        });
    })

  return (
    <main className="flex flex-col p-8">
      <h1 className="text-5xl font-bold mb-8">Control Stock Beauty</h1>
      <div className="">
        <DataTable columns={controlStockBeautyColumns} data={groupedData} />
      </div>
    </main>
  );
}