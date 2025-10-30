import { Expense, FilteredExpensesResult } from "@/app/types/cloture";
import { Product } from "@/app/types/product_template";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractBoutiqueCode(locationName: string): string {
  if (!locationName){
    return 'other';
  }
  
  const name = locationName.toLowerCase();
  
  if (name.includes('pb.24/boutique 24') || name.includes('aah/stock/emballage') || name.includes('PB.24/Dup')) return 'P24';
  if (name.includes('pbktm/')) return 'ktm';
  if (name.includes('mto/stock')) return 'mto';
  if (name.includes('pblmb/')) return 'lmb';
  if (name.includes('pbonl/')|| name.includes('pb.24/boutique onl')) return 'onl';
  if (name.includes('dcbty') || name.includes('p.bty/stock') || name.includes('dcfem')) return 'dc';
  

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

/**
 * Filtre et somme les dépenses selon des mots-clés dans product_id[1]
 * @param expenses - Tableau des dépenses
 * @param keywords - Mots-clés à rechercher (peut être un string ou array de strings)
 * @param matchType - 'any' (au moins un mot) ou 'all' (tous les mots)
 * @returns Objet avec dépenses filtrées, total et count
 */
export function filterAndSumExpensesByKeywords(
  expenses: Expense[], 
  keywords: string | string[],
  matchType: 'any' | 'all' = 'any'
): FilteredExpensesResult {
  // Normaliser les keywords en array
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
  
  // Filtrer les dépenses selon les mots-clés
  const filteredExpenses = expenses.filter(expense => {
    const productName = expense.product_id[1]?.toLowerCase() || '';
    
    if (matchType === 'any') {
      // Au moins un mot doit matcher
      return keywordArray.some(keyword => 
        productName.includes(keyword.toLowerCase())
      );
    } else {
      // Tous les mots doivent matcher
      return keywordArray.every(keyword => 
        productName.includes(keyword.toLowerCase())
      );
    }
  });
  
  // Calculer le total
  const totalAmount = filteredExpenses.reduce((sum, expense) => 
    sum + (expense.total_amount || 0), 0
  );
  
  return {
    filteredExpenses,
    totalAmount,
    count: filteredExpenses.length
  };
}