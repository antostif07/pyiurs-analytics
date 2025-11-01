import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Search, FileText, Eye, Building, ArrowLeft, Calendar, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { pdfService } from "@/lib/pdf/cloture-service"
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