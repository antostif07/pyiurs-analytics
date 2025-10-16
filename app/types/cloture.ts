export interface Expense {
  id: number
  amount: number
  description?: string
  date: string
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