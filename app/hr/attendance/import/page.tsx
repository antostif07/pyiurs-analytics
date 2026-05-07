"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import { 
  Upload, Save, Loader2, UserCheck, CheckCircle2, FileSpreadsheet, Info
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatExcelTime, getInitialStatus } from '../utils';
import { ATTENDANCE_LABELS, AttendanceStatus } from '@/lib/supabase/types';
import { toast } from 'sonner';

export default function AttendanceImportPage() {
  const supabase = createClient();
  
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => String(currentYearNum - i));
  
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('id, name, matricule').eq('is_active', true).order('name');
      console.log(data);
      
      setDbEmployees(data || []);
    };
    fetchEmployees();
  }, [supabase]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });

      const results: any[] = [];
      const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nameIdx = row.findIndex(cell => String(cell).includes("Name :"));

        if (nameIdx !== -1) {
          const nameValue = String(row[nameIdx + 2] || row[nameIdx + 1]).trim();
          const timeRow = rows[i + 1];

          if (timeRow && nameValue && nameValue !== "undefined") {
            const daysData = [];
            for (let d = 0; d < daysInMonth; d++) {
              const time = formatExcelTime(timeRow[d]);
              const dateObj = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, d + 1);
              daysData.push({
                day: d + 1,
                time,
                status: getInitialStatus(time, dateObj)
              });
            }
            results.push({ nameFromFile: nameValue, days: daysData });
          }
        }
      }
      setParsedData(results);
    };
    reader.readAsBinaryString(file);
  };

  const saveAttendances = async () => {
    if (Object.keys(mappings).length === 0) {
        toast.error("Action impossible", {
            description: "Veuillez lier au moins un agent avant de sauvegarder."
        });
        return;
    }

    setIsSaving(true);
    const toInsert: any[] = [];

    parsedData.forEach(pEmp => {
        const empId = mappings[pEmp.nameFromFile];
        if (empId) {
            pEmp.days.forEach((dayData: any) => {
                // Construction propre de la date YYYY-MM-DD
                const date = `${selectedYear}-${selectedMonth}-${String(dayData.day).padStart(2, '0')}`;
                
                toInsert.push({
                    employee_id: empId,
                    date: date,
                    check_in: dayData.time || null,
                    status: dayData.status,
                    is_late: dayData.time ? dayData.time > "09:01" : false,
                    // Ajoute l'ID de celui qui confirme si tu l'as (optionnel)
                    // confirmed_by: (await supabase.auth.getUser()).data.user?.id 
                });
            });
        }
    });

    if (toInsert.length === 0) {
        toast.warning("Aucune donnée", { description: "Aucun pointage n'a été trouvé dans le fichier." });
        setIsSaving(false);
        return;
    }

    console.log("Tentative d'insertion de", toInsert.length, "lignes...");

    // Tentative d'upsert
    const { error } = await supabase
        .from('attendances')
        .upsert(toInsert, { 
            onConflict: 'employee_id, date', // Doit correspondre à la contrainte SQL créée à l'étape 1
            ignoreDuplicates: false 
        });

    if (error) {
        toast.error("Erreur de sauvegarde", {
            description: error.message || "Une erreur est survenue lors de l'insertion."
        });
    } else {
      toast.success("Importation réussie", {
          description: `Succès ! ${toInsert.length} pointages ont été enregistrés ou mis à jour.`,
      });
        setParsedData([]); // On vide l'interface après succès
        setMappings({});
    }
      
    setIsSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import des présences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importez et associez les données de pointage des employés
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            id="upload"
            hidden
            onChange={handleFileUpload}
            accept=".xlsx"
          />

          <Button variant="outline" asChild className="h-9">
            <label htmlFor="upload" className="cursor-pointer flex items-center">
              <Upload className="w-4 h-4 mr-2" />
              Importer Excel
            </label>
          </Button>

          {parsedData.length > 0 && (
            <Button
              onClick={saveAttendances}
              disabled={isSaving}
              className="h-9"
            >
              {isSaving ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      {/* FILTRES */}
      <Card className="p-5 border bg-card shadow-sm rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Période</p>
            <p className="text-xs text-muted-foreground">
              Sélectionnez le mois et l'année d'importation
            </p>
          </div>

          <div className="flex gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem
                    key={i}
                    value={String(i + 1).padStart(2, "0")}
                  >
                    {new Date(2000, i).toLocaleString("fr-FR", {
                      month: "long",
                    }).toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28 h-9 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* CONTENT */}
      {parsedData.length > 0 ? (
        <Tabs defaultValue={parsedData[0].nameFromFile}>
          
          {/* TABS */}
          <div className="border-b pb-2 overflow-x-auto">
            <TabsList className="bg-transparent">
              {parsedData.map((emp) => (
                <TabsTrigger
                  key={emp.nameFromFile}
                  value={emp.nameFromFile}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  {emp.nameFromFile}
                  {mappings[emp.nameFromFile] && (
                    <CheckCircle2 className="ml-2 w-4 h-4 text-emerald-500" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {parsedData.map((user) => (
            <TabsContent
              key={user.nameFromFile}
              value={user.nameFromFile}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
            >
              
              {/* MAPPING */}
              <Card className="p-6 rounded-2xl border shadow-sm space-y-5">
                <div>
                  <h3 className="font-semibold text-sm">
                    Association employé
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Liez cet utilisateur à un employé existant
                  </p>
                </div>

                <Select
                  onValueChange={(val) =>
                    setMappings((prev) => ({
                      ...prev,
                      [user.nameFromFile]: val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.matricule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-xs text-muted-foreground flex gap-2">
                  <Info className="w-3 h-3 mt-[2px]" />
                  Vérifiez la correspondance du matricule
                </div>
              </Card>

              {/* TABLE */}
              <Card className="lg:col-span-2 overflow-hidden border rounded-2xl shadow-sm">
                <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                  <p className="text-sm font-medium">
                    Détails des présences
                  </p>
                </div>

                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-6 py-3 text-left">Jour</th>
                      <th className="px-6 py-3 text-left">Heure</th>
                      <th className="px-6 py-3 text-right">Statut</th>
                    </tr>
                  </thead>

                  <tbody>
                    {user.days.map((day: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b last:border-none hover:bg-muted/20 transition"
                      >
                        <td className="px-6 py-3 font-medium">
                          {day.day}
                        </td>

                        <td className="px-6 py-3 font-mono text-primary">
                          {day.time || "--:--"}
                        </td>

                        <td className="px-6 py-3 text-right">
                          <select
                            value={day.status}
                            onChange={(e) => {
                              const newData = [...parsedData];
                              newData.find(
                                (u) =>
                                  u.nameFromFile === user.nameFromFile
                              ).days[idx].status = e.target.value;
                              setParsedData(newData);
                            }}
                            className={`text-xs font-semibold px-2 py-1 rounded-md border ${getStatusColor(
                              day.status
                            )}`}
                          >
                            {(Object.keys(
                              ATTENDANCE_LABELS
                            ) as AttendanceStatus[]).map((statusKey) => (
                              <option key={statusKey} value={statusKey}>
                                {ATTENDANCE_LABELS[statusKey]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="h-72 border border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
          <FileSpreadsheet className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">
            Importez un fichier Excel pour commencer
          </p>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: AttendanceStatus) {
    switch(status) {
        case 'present': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        case 'late': return 'bg-amber-50 text-amber-600 border-amber-200';
        case 'absent': return 'bg-red-50 text-red-600 border-red-200';
        case 'repos': return 'bg-blue-50 text-blue-600 border-blue-200';
        case 'conge_circonstanciel':
        case 'conge_non_circonstanciel': return 'bg-purple-50 text-purple-600 border-purple-200';
        case 'sick': return 'bg-pink-50 text-pink-600 border-pink-200';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
}