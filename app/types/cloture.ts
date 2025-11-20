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
  journal_id: [number, string] | null
}

export interface ExpenseSheet {
  id: number,
  display_name: string,
  expense_line_ids: number[],
  expenses: Expense[],
  journal_id: [number, string] | null,
  name: string,
  payment_mode: string,
  payment_state: string,
  total_amount: number,
  state: string,
  create_date: string,
  company_id: [number, string],
  product_ids: [number]
}

export interface AccountAccount {
  id: number
  name: string
  code: string
  x_studio_categorie_compte: string | boolean
}


export interface FilteredExpensesResult {
  filteredExpenses: Expense[]
  totalAmount: number
  count: number
}

export type CashClosure = Database['public']['Tables']['cash_closures']['Row']
export type MainCashRow = Database['public']['Tables']['cash_closure_main_cash']['Row']
export type SecondaryCashRow = Database['public']['Tables']['cash_closure_secondary_cash']['Row']
export type CashDenomination = Database['public']['Tables']['cash_denominations']['Row']