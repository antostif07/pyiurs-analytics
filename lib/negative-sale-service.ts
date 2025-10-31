import { NegativeSaleJustification } from "./cloture-service"
import { supabase } from "./supabase"

export const negativeSaleService = {
  // Sauvegarder une justification
  async saveJustification(justification: Omit<NegativeSaleJustification, 'id'>): Promise<NegativeSaleJustification> {
    const { data, error } = await supabase
      .from('negative_sale_justifications')
      .insert([justification])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Récupérer les justifications pour une clôture
  async getJustificationsByClosureId(closureId: string): Promise<NegativeSaleJustification[]> {
    const { data, error } = await supabase
      .from('negative_sale_justifications')
      .select('*')
      .eq('cash_closure_id', closureId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  // Récupérer les justifications pour une vente spécifique
  async getJustificationBySaleId(saleId: number): Promise<NegativeSaleJustification | null> {
    const { data, error } = await supabase
      .from('negative_sale_justifications')
      .select('*')
      .eq('sale_id', saleId)
      .single()

    if (error) return null
    return data
  }
}