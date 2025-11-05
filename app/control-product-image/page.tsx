import { OdooProductTemplate } from "../types/product_template";
import ProductsWithoutImagesClient from "./control-product-image";

interface PageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

async function getProductsWithoutImages(): Promise<OdooProductTemplate[]> {
    const domain = JSON.stringify([
        ["image_1920","=", false],
        // ["categ_id.name", "ilike", "fashion"],
        // ["categ_id.name", "ilike", "beauty"]
    ])
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,default_code,create_date,categ_id&domain=${domain}`,
    { 
      next: { 
        revalidate: 300 // 5 minutes
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Produits templates");
  }

  const data = await res.json();
  return data.records || [];
}

export default async function ProductsWithoutImagesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const products = await getProductsWithoutImages();

  return (
    <ProductsWithoutImagesClient 
      initialProducts={products}
    />
  );
}