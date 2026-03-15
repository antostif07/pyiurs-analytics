import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client";
import { Denomination } from "../constants";
import { ClotureDataView, NegativeSaleJustification } from "../cloture-service";

export type ProductStatus = "critical" | "low" | "ok" | "overstock" | "dormant";

export interface StockProduct {
  name: string;
  ref: string;
  stock: number;
  dailySales: number;
  daysRemaining: number;
  restockQty: number;
  status: ProductStatus;
}

export interface PaginationMeta {
  page: number;
  pageCount: number;
  total: number;
}

export interface PaginatedStockData {
  data: StockProduct[];
  meta: PaginationMeta;
}

export interface CaissePrincipaleRow {
  modePaiement: string
  paymentMethod: string
  paymentMethodId?: number
  soldeOuverture: number
  ventesJour: number
  sortiesJour: number
  clotureTheorique: number
  cashPhysique: number
  managerConfirmed: boolean
  financierConfirmed: boolean
}

export interface CaisseSecondaireRow {
  categorie: string
  savingsCategory: string
  savingsCategoryId?: number
  soldeOuverture: number
  entreesEpargne: number
  sortiesEpargne: number
  soldeCloture: number
  validated: boolean
}

export interface ClotureVenteCloseProps {
  denominations: Denomination[]
  decrementDenomination: (index: number) => void
  incrementDenomination: (index: number) => void
  initialData: CloturePageDataType
  lastClosure: ClotureDataView | null
  negativeSaleJustifications: NegativeSaleJustification[]
  existingClosure?: ClotureDataView | null
  isReadOnly?: boolean
}