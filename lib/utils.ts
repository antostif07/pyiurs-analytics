import { Product } from "@/app/types/product_template";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractBoutiqueCode(locationName: string, productId?: number): string {
  if (!locationName){
    console.log(productId);
    
    return 'other';
  }
  
  const name = locationName.toLowerCase();
  
  if (name.includes('pb.24/boutique 24') || name.includes('aah/stock/emballage') || name.includes('PB.24/Dup')) return 'P24';
  if (name.includes('pbktm/')) return 'ktm';
  if (name.includes('mto/stock')) return 'mto';
  if (name.includes('pblmb/')) return 'lmb';
  if (name.includes('pbonl/')|| name.includes('pb.24/boutique onl')) return 'onl';
  if (name.includes('dcbty') || name.includes('p.bty/stock')) return 'dc';
  

  return 'other';
}

// Fonction pour extraire la marque du nom du produit
export function extractBrandFromProduct(product: Product): string {
  const brand = product.marque || 'Autres';
  return brand;
}

// Fonction pour extraire la couleur du produit
export function extractColorFromProduct(product: Product): string {
  const color = product.couleur || 'Non spécifié';
  return color;
}