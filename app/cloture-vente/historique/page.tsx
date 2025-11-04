import { supabase } from "@/lib/supabase"
import { Historique } from "./historique.client"
import { ClotureDataView } from "@/lib/cloture-service"

// interface HistoriquePageProps {
//   searchParams: Promise<{
//     date?: string
//     shop?: string
//   }>
// }

async function getCloturesHistory() {
  const { data, error } = await supabase
    .from('cash_closures')
    .select(`
      *,
      cash_closure_main_cash (*),
      cash_closure_secondary_cash (*),
      cash_denominations (*)
    `)
    .order('closing_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Erreur récupération historique:', error)
    return []
  }

  return data || []
}

export default async function HistoriqueCloturesPage() {
  // const params = await searchParams
  const clotures = await getCloturesHistory() as ClotureDataView[]

  return (
    <Historique clotures={clotures} />
  )
}