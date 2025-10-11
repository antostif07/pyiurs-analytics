import { Product } from "@/app/types/product_template";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractBoutiqueCode(locationName: string): string {
  if (!locationName) return 'other';
  
  const name = locationName.toLowerCase();
  
  if (name.includes('24') || name.includes('p24')) return 'P24';
  if (name.includes('ktm')) return 'ktm';
  if (name.includes('mto')) return 'mto';
  if (name.includes('onl')) return 'onl';
  if (name.includes('dc')) return 'dc';
  
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