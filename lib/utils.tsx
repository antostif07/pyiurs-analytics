import { EditableCell } from "@/app/gestion-drive/[id]/components/EditableCell";
import { Expense, ExpenseSheet, FilteredExpensesResult } from "@/app/types/cloture";
import { CellData, DocumentColumn, DocumentRow } from "@/app/types/documents";
import { Product } from "@/app/types/product_template";
import { ColumnDef } from "@tanstack/react-table";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type RowData = { id: string; [key: string]: any };

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
  expenses: ExpenseSheet[], 
  keywords: string | string[],
  matchType: 'any' | 'all' = 'any'
): FilteredExpensesResult {
  // Normaliser les keywords en array
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
  
  // Filtrer les dépenses selon les mots-clés
  const filteredExpenses = expenses.filter(expense => {
    console.log(expense.expenses);

    const result = [];

    expense.expenses.forEach((exp) => {
      const productName = exp.product_id[1]?.toLowerCase() || '';

      if (matchType === 'any') {
        // Au moins un mot doit matcher
        const match = keywordArray.some(keyword => 
          productName.includes(keyword.toLowerCase())
        );
        if (match) {
          result.push(exp);
        }
      } else {
        // Tous les mots doivent matcher
        const match = keywordArray.every(keyword => 
          productName.includes(keyword.toLowerCase())
        );
        if (match) {
          result.push(exp);
        }
      }
    });
  });
  
  // Calculer le total
  const totalAmount = filteredExpenses.reduce((sum, expense) => 
    sum + (expense.total_amount || 0), 0
  );
  
  return {
    filteredExpenses: [], // filteredExpenses,
    totalAmount: 0,
    count: 0
  };
}

export function generateColumns<TData = any>(
  columnConfigs: DocumentColumn[]
): ColumnDef<TData>[] {
  
  // On trie d'abord par order_index pour respecter l'ordre voulu
  return columnConfigs
    .sort((a, b) => a.order_index - b.order_index)
    .map((col) => {
      
      // Base de la définition de colonne
      const columnDef: ColumnDef<TData> = {
        accessorKey: col.id, // On suppose que la donnée de la ligne a pour clé l'ID de la colonne
        id: col.id,
        header: col.label,
        size: col.width, // Utilisation de la largeur définie
        
        // On peut styliser le header avec les couleurs fournies
        // (Cela dépend de comment votre composant Table affiche le header)
        meta: {
            type: col.data_type,
            options: col.config?.options || [], // Pour les selects
            style: {
                backgroundColor: col.background_color,
                color: col.text_color
            }
        },

        // Définition dynamique du rendu de la cellule (Cell)
        cell: (cellProps) => {
          // forward all props from the CellContext and inject the expected 'columns' prop
          return <EditableCell {...(cellProps)} columns={columnConfigs} />;
        }
      };

      return columnDef;
    });
}

const getCellValue = (cell: CellData) => {
  switch (cell.value_type) {
    case "text":
    case "select": // Souvent stocké en text
    case "multiline":
      return cell.text_value;
    case "number":
      return cell.number_value;
    case "date":
      return cell.date_value;
    case "boolean":
      return cell.boolean_value;
    case "file":
      // Pour les fichiers, on retourne souvent un objet ou une URL
      // Ici, le JSON montre null, mais supposons que ce soit text_value ou autre
      return cell.text_value || "Fichier (Lien)"; 
    default:
      return null;
  }
};

export function transformToTableData(rows: DocumentRow[], cells: CellData[]): RowData[] {
  const cellsByRow: Record<string, Record<string, any>> = {};

  cells.forEach((cell) => {
    if (!cellsByRow[cell.row_id]) cellsByRow[cell.row_id] = {};
    
    // 1. On stocke la valeur pour l'affichage (clé = column_id)
    cellsByRow[cell.row_id][cell.column_id] = getCellValue(cell);
    
    // 2. ON STOCKE AUSSI L'ID DE LA CELLULE (clé = column_id + "_id")
    cellsByRow[cell.row_id][`${cell.column_id}_id`] = cell.id; 
  });

  return rows.map((row) => {
    const rowValues = cellsByRow[row.id] || {};
    return {
      id: row.id,
      ...rowValues,
    };
  });
}
