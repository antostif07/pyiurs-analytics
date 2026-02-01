'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { 
  Upload, Save, Loader2, UserCheck, 
  AlertCircle, CheckCircle2, Calendar, 
  Clock, ArrowRight, FileSpreadsheet
} from 'lucide-react'

// UI SHADCN
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'

interface ParsedEmployee {
  nameFromFile: string;
  days: (string | null)[];
}

export default function AttendanceImportPage() {
  const supabase = createClient()
  
  const [dbEmployees, setDbEmployees] = useState<any[]>([])
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({}) // { "glody": "uuid-supabase" }
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 1. Charger les employés pour le Select
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase.from('employees').select('id, name, matricule').eq('is_active', true).order('name')
      if (data) setDbEmployees(data)
    }
    fetchEmployees()
  }, [])

  // 2. Parser le fichier Excel spécifique (Format Matrix)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })

      const results: ParsedEmployee[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const nameLabelIdx = row.findIndex(cell => String(cell).includes("Name :"))

        if (nameLabelIdx !== -1) {
          // Extraction du nom (Généralement 2 colonnes après "Name :")
          const nameValue = String(row[nameLabelIdx + 2] || row[nameLabelIdx + 1]).trim()
          
          // La ligne des DATA est juste en dessous (i+1)
          const timeRow = rows[i + 1]
          if (timeRow && nameValue && nameValue !== "undefined") {
            const daysData = []
            // On prend les 31 colonnes (A à AE)
            for (let d = 0; d < 31; d++) {
              daysData.push(timeRow[d] ? String(timeRow[d]) : null)
            }
            results.push({ nameFromFile: nameValue, days: daysData })
          }
        }
      }
      setParsedData(results)
      setLoading(false)
    }
    reader.readAsBinaryString(file)
  }

  // 3. Sauvegarder dans Supabase
  const saveAttendances = async () => {
    if (Object.keys(mappings).length === 0) return alert("Veuillez lier au moins un employé.")
    
    setIsSaving(true)
    const toInsert: any[] = []

    parsedData.forEach(pEmp => {
      const supabaseId = mappings[pEmp.nameFromFile]
      if (supabaseId) {
        pEmp.days.forEach((time, index) => {
          const day = index + 1
          const date = `2025-01-${String(day).padStart(2, '0')}`
          
          toInsert.push({
            employee_id: supabaseId,
            date: date,
            check_in: time || null,
            status: !time ? 'absent' : (time > "08:30" ? 'late' : 'present'),
            is_late: time ? time > "08:30" : false
          })
        })
      }
    })

    const { error } = await supabase.from('attendances').insert(toInsert)

    if (error) {
      alert("Erreur: " + error.message)
    } else {
      alert("Pointages enregistrés avec succès !")
      setParsedData([])
      setMappings({})
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Importation Pointage</h1>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
            <Calendar size={14} className="text-rose-500" /> Janvier 2025 • Format Biométrique
          </p>
        </div>
        
        {parsedData.length > 0 && (
          <Button 
            onClick={saveAttendances}
            disabled={isSaving}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-8 h-12 font-bold shadow-lg shadow-rose-100 transition-all"
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
            Valider la Paie ({Object.keys(mappings).length} / {parsedData.length})
          </Button>
        )}
      </div>

      {parsedData.length === 0 ? (
        <label className="group border-2 border-dashed border-gray-200 rounded-[40px] p-24 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-all">
          <div className="bg-rose-50 p-6 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="text-rose-600" size={48} />
          </div>
          <p className="text-gray-700 font-bold text-lg text-center">Déposez l'export de la machine ici</p>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-black">Excel (.xlsx)</p>
          <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx" />
        </label>
      ) : (
        <Tabs defaultValue={parsedData[0].nameFromFile} className="w-full">
          <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <ScrollArea className="w-full">
              <TabsList className="bg-transparent h-auto p-1 gap-2 flex justify-start">
                {parsedData.map((emp) => (
                  <TabsTrigger 
                    key={emp.nameFromFile} 
                    value={emp.nameFromFile}
                    className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all border border-transparent data-[state=active]:border-rose-100"
                  >
                    {emp.nameFromFile}
                    {mappings[emp.nameFromFile] && <CheckCircle2 size={12} className="ml-2" />}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          {parsedData.map((user) => (
            <TabsContent key={user.nameFromFile} value={user.nameFromFile} className="mt-0 focus-visible:ring-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CONFIGURATION DU LIEN (Col 1) */}
                <Card className="p-8 h-fit space-y-6 border-none shadow-sm rounded-[32px] bg-white">
                  <div className="space-y-2">
                    <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                        <UserCheck size={24} />
                    </div>
                    <h3 className="font-black text-gray-900 text-xl">Liaison RH</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Associez <span className="font-bold text-rose-600">"{user.nameFromFile}"</span> à un employé de votre base de données pour calculer sa paie.
                    </p>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Employé Supabase</Label>
                    <Select onValueChange={(val) => setMappings(prev => ({ ...prev, [user.nameFromFile]: val }))}>
                        <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold text-gray-700">
                            <SelectValue placeholder="Choisir l'employé..." />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                            {dbEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id} className="font-medium">
                                    {emp.name} <span className="text-[10px] text-gray-400 ml-2">({emp.matricule})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {!mappings[user.nameFromFile] && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 animate-pulse">
                            <AlertCircle size={20} />
                            <span className="text-[10px] font-black uppercase leading-tight">Action requise avant validation</span>
                        </div>
                    )}
                  </div>
                </Card>

                {/* TABLEAU DES PRÉSENCES (Col 2 & 3) */}
                <Card className="lg:col-span-2 border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                   <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Journal des pointages</h4>
                        <Badge className="bg-gray-900">31 Jours analysés</Badge>
                   </div>
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Heure</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Statut</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {user.days.map((time, idx) => (
                            <tr key={idx} className={!time ? "bg-red-50/20" : "hover:bg-gray-50/30 transition-colors"}>
                            <td className="px-8 py-3 text-sm font-bold text-gray-500">
                                {idx + 1} Janvier
                            </td>
                            <td className="px-8 py-3 font-black text-gray-900">
                                {time ? (
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-gray-300" />
                                        {time}
                                    </div>
                                ) : "—"}
                            </td>
                            <td className="px-8 py-3 text-right">
                                {!time ? (
                                    <Badge variant="destructive" className="uppercase text-[9px] font-black">Absent</Badge>
                                ) : time > "08:30" ? (
                                    <Badge className="bg-amber-500 uppercase text-[9px] font-black">Retard</Badge>
                                ) : (
                                    <Badge className="bg-emerald-500 uppercase text-[9px] font-black">Présent</Badge>
                                )}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                   </div>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}