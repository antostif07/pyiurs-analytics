import { Database, supabase } from "./supabase"

// type CashClosure = Database['public']['Tables']['cash_closures']['Row']
type CashClosureInsert = Database['public']['Tables']['cash_closures']['Insert']
// type MainCashRow = Database['public']['Tables']['cash_closure_main_cash']['Row']
type MainCashInsert = Database['public']['Tables']['cash_closure_main_cash']['Insert']
// type SecondaryCashRow = Database['public']['Tables']['cash_closure_secondary_cash']['Row']
type SecondaryCashInsert = Database['public']['Tables']['cash_closure_secondary_cash']['Insert']
type CashDenominationInsert = Database['public']['Tables']['cash_denominations']['Insert']

export interface ClotureData {
  closure: Omit<CashClosureInsert, 'id' | 'created_at' | 'updated_at'>
  mainCash: Omit<MainCashInsert, 'id' | 'cash_closure_id' | 'created_at' | 'updated_at'>[]
  secondaryCash: Omit<SecondaryCashInsert, 'id' | 'cash_closure_id' | 'created_at' | 'updated_at'>[]
  denominations: Omit<CashDenominationInsert, 'id' | 'cash_closure_id' | 'created_at'>[]
}

export const clotureService = {
  // Créer une nouvelle clôture
  async createCloture(data: ClotureData) {
    const { closure, mainCash, secondaryCash, denominations } = data

    // Commencer une transaction
    const { data: closureData, error: closureError } = await supabase
      .from('cash_closures')
      .insert(closure)
      .select()
      .single()

    if (closureError) {
      console.error('Erreur création clôture:', closureError)
      throw new Error(`Erreur création clôture: ${closureError.message}`)
    }

    const closureId = closureData.id

    // Insérer les lignes de caisse principale
    if (mainCash.length > 0) {
      const mainCashData = mainCash.map(row => ({
        ...row,
        cash_closure_id: closureId
      }))

      const { error: mainCashError } = await supabase
        .from('cash_closure_main_cash')
        .insert(mainCashData)

      if (mainCashError) {
        console.error('Erreur caisse principale:', mainCashError)
        throw new Error(`Erreur caisse principale: ${mainCashError.message}`)
      }
    }

    // Insérer les lignes de caisse secondaire
    if (secondaryCash.length > 0) {
      const secondaryCashData = secondaryCash.map(row => ({
        ...row,
        cash_closure_id: closureId
      }))

      const { error: secondaryCashError } = await supabase
        .from('cash_closure_secondary_cash')
        .insert(secondaryCashData)

      if (secondaryCashError) {
        console.error('Erreur caisse secondaire:', secondaryCashError)
        throw new Error(`Erreur caisse secondaire: ${secondaryCashError.message}`)
      }
    }

    // Insérer la billeterie
    if (denominations.length > 0) {
      const denominationsData = denominations.map(row => ({
        ...row,
        cash_closure_id: closureId
      }))

      const { error: denominationsError } = await supabase
        .from('cash_denominations')
        .insert(denominationsData)

      if (denominationsError) {
        console.error('Erreur billeterie:', denominationsError)
        throw new Error(`Erreur billeterie: ${denominationsError.message}`)
      }
    }

    return closureData
  },

  // Récupérer une clôture par date et boutique
  async getClotureByDateAndShop(date: string, shopId: number) {
    const { data, error } = await supabase
      .from('cash_closures')
      .select(`
        *,
        cash_closure_main_cash (*),
        cash_closure_secondary_cash (*),
        cash_denominations (*)
      `)
      .eq('closure_date', date)
      .eq('shop_id', shopId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Erreur récupération clôture: ${error.message}`)
    }

    return data
  },

  // Vérifier si une clôture existe déjà pour cette date et boutique
  async checkExistingClosure(date: string, shopId: number) {
    const { data, error } = await supabase
      .from('cash_closures')
      .select('id')
      .eq('closure_date', date)
      .eq('shop_id', shopId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erreur vérification clôture: ${error.message}`)
    }

    return data !== null
  }
}