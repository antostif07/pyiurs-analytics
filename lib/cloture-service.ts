import { CashClosure } from "@/app/types/cloture"
import { Database, supabase } from "./supabase"

export interface NegativeSaleJustification {
  id?: string
  cash_closure_id: string
  sale_id: number
  sale_reference: string
  sale_amount: number
  justification_text: string
  manager_id: number
  manager_name?: string
  justification_date: Date
}

// type CashClosure = Database['public']['Tables']['cash_closures']['Row']
type CashClosureInsert = Database['public']['Tables']['cash_closures']['Insert']
type MainCashRow = Database['public']['Tables']['cash_closure_main_cash']['Row']
type MainCashInsert = Database['public']['Tables']['cash_closure_main_cash']['Insert']
type SecondaryCashRow = Database['public']['Tables']['cash_closure_secondary_cash']['Row']
type SecondaryCashInsert = Database['public']['Tables']['cash_closure_secondary_cash']['Insert']
type CashDenominationInsert = Database['public']['Tables']['cash_denominations']['Insert']

export interface ClotureDataView extends CashClosureInsert {
  cash_closure_main_cash: MainCashRow[]
  cash_closure_secondary_cash: SecondaryCashRow[]
  denominations: CashDenominationInsert[]
  negativeSaleJustifications?: NegativeSaleJustification[]
}

export interface ClotureData {
  closure: Omit<CashClosureInsert, 'id' | 'created_at' | 'updated_at'>
  mainCash: Omit<MainCashInsert, 'id' | 'cash_closure_id' | 'created_at' | 'updated_at'>[]
  secondaryCash: Omit<SecondaryCashInsert, 'id' | 'cash_closure_id' | 'created_at' | 'updated_at'>[]
  denominations: Omit<CashDenominationInsert, 'id' | 'cash_closure_id' | 'created_at'>[]
  negativeSaleJustifications?: NegativeSaleJustification[]
}

export const clotureService = {
  /**
   * Vérifier si on peut clôturer une période
  */
  async canClosePeriod(startDate: string, endDate: string, shopId: number): Promise<{
    canClose: boolean
    reason?: string
    overlappingClosure?: Database['public']['Tables']['cash_closures']['Row']
  }> {
    try {
      // Vérifier les chevauchements avec les périodes existantes
      const { data: overlapping, error } = await supabase
        .from('cash_closures')
        .select('*')
        .eq('shop_id', shopId)
        .or(`and(opening_date.lte.${endDate},closing_date.gte.${startDate})`)

      if (error) {
        console.error('Erreur vérification chevauchement:', error)
        return {
          canClose: false,
          reason: 'Erreur lors de la vérification des périodes existantes'
        }
      }

      if (overlapping && overlapping.length > 0) {
        const overlappingClosure = overlapping[0] as CashClosure
        return {
          canClose: false,
          reason: `La période du ${startDate} au ${endDate} chevauche une clôture existante du ${overlappingClosure.opening_date} au ${overlappingClosure.closing_date}`,
          overlappingClosure: overlappingClosure
        }
      }

      // Vérifier que la date de fin n'est pas avant la date de début
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (end < start) {
        return {
          canClose: false,
          reason: 'La date de fin ne peut pas être avant la date de début'
        }
      }

      return { canClose: true }
    } catch (error) {
      console.error('Erreur inattendue dans canClosePeriod:', error)
      return {
        canClose: false,
        reason: 'Erreur inattendue lors de la vérification de la période'
      }
    }
  },

  /**
   * Récupérer la dernière clôture d'une boutique
   */
  async getLastClosureByShop(shopId: number) {
    const { data, error } = await supabase
      .from('cash_closures')
      .select(`
        *,
        cash_closure_main_cash (*),
        cash_closure_secondary_cash (*),
        cash_denominations (*)
      `)
      .eq('shop_id', shopId)
      .order('closing_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erreur récupération dernière clôture: ${error.message}`)
    }

    return data
  },

  // Créer une nouvelle clôture
  async createCloture(data: ClotureData) {
    const { closure, mainCash, secondaryCash, denominations, negativeSaleJustifications } = data

    // Vérifie la dernière clôture
    const lastClosure = await this.getLastClosureByShop(closure.shop_id)

    if (lastClosure) {
      const lastDate = new Date((lastClosure as CashClosure).closing_date)
      const newDate = new Date(closure.opening_date)

      if (newDate <= lastDate) {
        throw new Error(
          `Impossible de clôturer une date antérieure ou égale à la dernière clôture (${(lastClosure as CashClosure).closing_date})`
        )
      }
    }
    
    const canClose = await this.canClosePeriod(
      closure.opening_date, 
      closure.closing_date, 
      closure.shop_id
    )

    if (!canClose.canClose) {
      throw new Error(canClose.reason || 'Période de clôture non valide')
    }

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

    const closureId = (closureData as ClotureDataView).id

    // Sauvegarder les justifications des ventes négatives
    if (negativeSaleJustifications && negativeSaleJustifications.length > 0) {
      const justificationsWithClosureId = negativeSaleJustifications.map(justification => ({
        ...justification,
        cash_closure_id: closureId
      }))

      const { error: justificationError } = await supabase
        .from('negative_sale_justifications')
        .insert(justificationsWithClosureId)

      if (justificationError) {
        console.error('Erreur sauvegarde justifications:', justificationError)
        // Ne pas throw pour ne pas bloquer la clôture principale, mais logger l'erreur
      }
    }

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

  async getClotureById(closureId: string) {
    const { data, error } = await supabase
      .from('cash_closures')
      .select(`
        *,
        cash_closure_main_cash (*),
        cash_closure_secondary_cash (*),
        cash_denominations (*)
      `)
      .eq('id', closureId)
      .single()

    if (error) throw new Error(`Erreur récupération clôture: ${error.message}`)
    return data
  },

  // Vérifier si une clôture existe déjà pour cette date et boutique
  async checkExistingClosurePeriod(openingDate: string, closingDate: string, shopId: number) {
    const { data, error } = await supabase
      .from('cash_closures')
      .select('id')
      .eq('shop_id', shopId)
      .or(`and(opening_date.lte.${closingDate},closing_date.gte.${openingDate})`) // chevauchement
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erreur vérification clôture: ${error.message}`)
    }

    return data !== null
  }
}