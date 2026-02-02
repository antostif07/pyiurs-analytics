'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { 
  Upload, Save, Loader2, UserCheck, 
  AlertCircle, CheckCircle2, Calendar, 
  Clock, FileSpreadsheet, ChevronDown
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

const MONTHS = [
  { val: "01", label: "Janvier" }, { val: "02", label: "Février" },
  { val: "03", label: "Mars" }, { val: "04", label: "Avril" },
  { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juillet" }, { val: "08", label: "Août" },
  { val: "09", label: "Septembre" }, { val: "10", label: "Octobre" },
  { val: "11", label: "Novembre" }, { val: "12", label: "Décembre" }
];

function formatExcelTime(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === 'string' && value.includes(':')) return value;
  if (typeof value === 'number') {
    const totalSeconds = Math.round(value * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return null;
}

export default function AttendanceImportPage() {
  const supabase = createClient()
  
  // États de période
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))

  const [dbEmployees, setDbEmployees] = useState<any[]>([])
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Calcul du nombre de jours dans le mois sélectionné
  const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase.from('employees').select('id, name, matricule').eq('is_active', true).order('name')
      if (data) setDbEmployees(data)
    }
    fetchEmployees()
  }, [])

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
          const nameValue = String(row[nameLabelIdx + 2] || row[nameLabelIdx + 1]).trim()
          const timeRow = rows[i + 1]

          if (timeRow && nameValue && nameValue !== "undefined") {
            const daysData = []
            // On boucle sur le nombre réel de jours du mois sélectionné
            for (let d = 0; d < daysInMonth; d++) {
              daysData.push(formatExcelTime(timeRow[d]));
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

  const saveAttendances = async () => {
    if (Object.keys(mappings).length === 0) return alert("Veuillez lier au moins un employé.")
    
    setIsSaving(true)
    const toInsert: any[] = []

    parsedData.forEach(pEmp => {
      const supabaseId = mappings[pEmp.nameFromFile]
      if (supabaseId) {
        pEmp.days.forEach((time, index) => {
          const day = String(index + 1).padStart(2, '0')
          const date = `${selectedYear}-${selectedMonth}-${day}`
          
          toInsert.push({
            employee_id: supabaseId,
            date: date,
            check_in: time || null,
            status: !time ? 'absent' : (time > "09:00" ? 'late' : 'present'),
            is_late: time ? time > "09:01" : false
          })
        })
      }
    })

    const { error } = await supabase.from('attendances').insert(toInsert)

    if (error) {
      alert("Erreur: " + error.message)
    } else {
      alert(`Pointages de ${MONTHS.find(m => m.val === selectedMonth)?.label} enregistrés !`)
      setParsedData([])
      setMappings({})
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER AVEC SÉLECTEUR DE PÉRIODE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-gray-900">Importation Pointage</h1>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-8 rounded-full border-gray-100 bg-rose-50 text-rose-600 font-bold text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] h-8 rounded-full border-gray-100 bg-gray-50 text-gray-600 font-bold text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {parsedData.length > 0 && (
          <Button 
            onClick={saveAttendances}
            disabled={isSaving}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-8 h-12 font-bold shadow-lg transition-all"
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
            Sauvegarder {Object.keys(mappings).length} employés
          </Button>
        )}
      </div>

      {parsedData.length === 0 ? (
        <label className="group border-2 border-dashed border-gray-200 rounded-[40px] p-24 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-rose-300 hover:bg-rose-50/30 transition-all">
          <div className="bg-rose-50 p-6 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="text-rose-600" size={48} />
          </div>
          <p className="text-gray-700 font-bold text-lg text-center">Cliquez pour importer le fichier de Janvier</p>
          <p className="text-gray-400 text-[10px] mt-1 uppercase tracking-[0.2em] font-black">Excel .xlsx uniquement</p>
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
                    className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all"
                  >
                    {emp.nameFromFile}
                    {mappings[emp.nameFromFile] && <CheckCircle2 size={12} className="ml-2" />}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          {parsedData.map((user) => (
            <TabsContent key={user.nameFromFile} value={user.nameFromFile} className="mt-0 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-8 h-fit space-y-6 border-none shadow-sm rounded-[32px] bg-white">
                  <div className="space-y-2 text-center lg:text-left">
                    <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-600 mb-4 mx-auto lg:mx-0">
                        <UserCheck size={24} />
                    </div>
                    <h3 className="font-black text-gray-900 text-xl">Lier l'employé</h3>
                    <p className="text-xs text-gray-500">Assignation pour {MONTHS.find(m => m.val === selectedMonth)?.label} {selectedYear}</p>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Base de données</Label>
                    <Select onValueChange={(val) => setMappings(prev => ({ ...prev, [user.nameFromFile]: val }))}>
                        <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                            <SelectValue placeholder="Choisir l'employé..." />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                            {dbEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card className="lg:col-span-2 border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase">Jour</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase">Arrivée</th>
                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Statut (Limite 09:00)</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {user.days.map((time, idx) => (
                            <tr key={idx} className={!time ? "bg-red-50/5" : "hover:bg-gray-50/30 transition-colors"}>
                            <td className="px-8 py-3 text-sm font-bold text-gray-400">
                                {idx + 1} {MONTHS.find(m => m.val === selectedMonth)?.label}
                            </td>
                            <td className="px-8 py-3 font-black text-gray-900">
                                {time || "—"}
                            </td>
                            <td className="px-8 py-3 text-right">
                                {!time ? (
                                    <Badge variant="destructive" className="text-[9px] font-black">ABSENT</Badge>
                                ) : time > "09:00" ? (
                                    <Badge className="bg-amber-500 text-[9px] font-black">RETARD</Badge>
                                ) : (
                                    <Badge className="bg-emerald-500 text-[9px] font-black">PRÉSENT</Badge>
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