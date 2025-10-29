import { Database } from "@/lib/supabase"

export interface Expense {
  id: number
  total_amount: number
  name: string
  create_date: string
  product_id: [number, string]
  company_id: [number, string]
  account_id: [number, string]
  account?: AccountAccount
}

export interface AccountAccount {
  id: number
  name: string
  code: string
  x_studio_categorie_compte: string | boolean
}

export type CashClosure = Database['public']['Tables']['cash_closures']['Row']
export type MainCashRow = Database['public']['Tables']['cash_closure_main_cash']['Row']
export type SecondaryCashRow = Database['public']['Tables']['cash_closure_secondary_cash']['Row']
export type CashDenomination = Database['public']['Tables']['cash_denominations']['Row']