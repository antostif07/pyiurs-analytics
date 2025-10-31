import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      cash_closures: {
        Row: {
          id: string
          opening_date: string
          closing_date: string
          shop_id: number
          shop_name: string | null
          total_sales: number
          total_expenses: number
          expected_cash: number
          physical_cash_usd: number
          physical_cash_cdf: number
          exchange_rate: number
          calculated_cash: number
          difference: number
          manager_id: number | null
          financier_id: number | null
          manager_validated_at: string | null
          financier_validated_at: string | null
          closure_status: 'draft' | 'manager_validated' | 'financier_validated' | 'completed'
          notes: string | null
          created_by: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          opening_date: string
          closing_date: string
          shop_id: number
          shop_name?: string | null
          total_sales?: number
          total_expenses?: number
          expected_cash?: number
          physical_cash_usd?: number
          physical_cash_cdf?: number
          exchange_rate?: number
          calculated_cash?: number
          difference?: number
          manager_id?: number | null
          financier_id?: number | null
          manager_validated_at?: string | null
          financier_validated_at?: string | null
          closure_status?: 'draft' | 'manager_validated' | 'financier_validated' | 'completed'
          notes?: string | null
          created_by?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          opening_date: string
          closing_date: string
          shop_id?: number
          shop_name?: string | null
          total_sales?: number
          total_expenses?: number
          expected_cash?: number
          physical_cash_usd?: number
          physical_cash_cdf?: number
          exchange_rate?: number
          calculated_cash?: number
          difference?: number
          manager_id?: number | null
          financier_id?: number | null
          manager_validated_at?: string | null
          financier_validated_at?: string | null
          closure_status?: 'draft' | 'manager_validated' | 'financier_validated' | 'completed'
          notes?: string | null
          created_by?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      cash_closure_main_cash: {
        Row: {
          id: string
          cash_closure_id: string
          payment_method_id: number | null
          payment_method: string
          payment_method_name: string
          opening_balance: number
          daily_sales: number
          daily_outflows: number
          theoretical_closure: number
          physical_cash: number
          manager_confirmed: boolean
          financier_confirmed: boolean
          manager_confirmed_by: number | null
          financier_confirmed_by: number | null
          manager_confirmed_at: string | null
          financier_confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cash_closure_id: string
          payment_method_id?: number | null
          payment_method: string
          payment_method_name: string
          opening_balance?: number
          daily_sales?: number
          daily_outflows?: number
          theoretical_closure?: number
          physical_cash?: number
          manager_confirmed?: boolean
          financier_confirmed?: boolean
          manager_confirmed_by?: number | null
          financier_confirmed_by?: number | null
          manager_confirmed_at?: string | null
          financier_confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cash_closure_id?: string
          payment_method_id?: number | null
          payment_method?: string
          payment_method_name?: string
          opening_balance?: number
          daily_sales?: number
          daily_outflows?: number
          theoretical_closure?: number
          physical_cash?: number
          manager_confirmed?: boolean
          financier_confirmed?: boolean
          manager_confirmed_by?: number | null
          financier_confirmed_by?: number | null
          manager_confirmed_at?: string | null
          financier_confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cash_closure_secondary_cash: {
        Row: {
          id: string
          cash_closure_id: string
          savings_category_id: number | null
          savings_category: string
          savings_category_name: string
          opening_balance: number
          savings_inflows: number
          savings_outflows: number
          closure_balance: number
          validated: boolean
          validated_by: number | null
          validated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cash_closure_id: string
          savings_category_id?: number | null
          savings_category: string
          savings_category_name: string
          opening_balance?: number
          savings_inflows?: number
          savings_outflows?: number
          closure_balance?: number
          validated?: boolean
          validated_by?: number | null
          validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cash_closure_id?: string
          savings_category_id?: number | null
          savings_category?: string
          savings_category_name?: string
          opening_balance?: number
          savings_inflows?: number
          savings_outflows?: number
          closure_balance?: number
          validated?: boolean
          validated_by?: number | null
          validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cash_denominations: {
        Row: {
          id: string
          cash_closure_id: string
          currency: 'USD' | 'CDF'
          denomination: number
          quantity: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          cash_closure_id: string
          currency: 'USD' | 'CDF'
          denomination: number
          quantity?: number
          amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          cash_closure_id?: string
          currency?: 'USD' | 'CDF'
          denomination?: number
          quantity?: number
          amount?: number
          created_at?: string
        }
      }
      closure_validation_logs: {
        Row: {
          id: string
          cash_closure_id: string
          action_type: 'manager_validation' | 'financier_validation' | 'savings_validation'
          target_id: string | null
          target_type: string | null
          user_id: number
          user_role: string
          action_timestamp: string
          previous_status: string | null
          new_status: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cash_closure_id: string
          action_type: 'manager_validation' | 'financier_validation' | 'savings_validation'
          target_id?: string | null
          target_type?: string | null
          user_id: number
          user_role: string
          action_timestamp?: string
          previous_status?: string | null
          new_status?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cash_closure_id?: string
          action_type?: 'manager_validation' | 'financier_validation' | 'savings_validation'
          target_id?: string | null
          target_type?: string | null
          user_id?: number
          user_role?: string
          action_timestamp?: string
          previous_status?: string | null
          new_status?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      negative_sale_justifications: {
        Row: {
          id: string
          cash_closure_id: string
          sale_id: number
          sale_reference: string
          sale_amount: number
          justification_text: string
          manager_id: number
          manager_name: string | null
          justification_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cash_closure_id: string
          sale_id: number
          sale_reference: string
          sale_amount: number
          justification_text: string
          manager_id: number
          manager_name?: string | null
          justification_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cash_closure_id?: string
          sale_id?: number
          sale_reference?: string
          sale_amount?: number
          justification_text?: string
          manager_id?: number
          manager_name?: string | null
          justification_date?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}