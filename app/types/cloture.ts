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

export interface CashClosure {
  id: string
  closure_date: string
  daily_sales_total: number
  expenses_total: number
  expected_cash: number
  physical_cash_usd: number
  physical_cash_cdf: number
  exchange_rate: number
  calculated_cash: number
  difference: number
  notes?: string
  created_at: string
}

export interface CashDenomination {
  id: string
  cash_closure_id: string
  currency: 'USD' | 'CDF'
  denomination: number
  quantity: number
  amount: number
  created_at: string
}