"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchX, Loader2, Save, Printer, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { calculatePayrollRow } from "../payroll-engine";
import { MONTHS } from "@/lib/utils";

export default function PayrollPrepClient({ initialEmployees, shops, month, year, shopId }: any) {
  const router = useRouter();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [debtDeductions, setDebtDeductions] = useState<Record<string, number>>({});

  // Calcul du nombre total de pointages pour le mois
  const totalAttendancesCount = useMemo(() => {
    return initialEmployees.reduce((acc: number, emp: any) => acc + (emp.attendances?.length || 0), 0);
  }, [initialEmployees]);

  // Fonction pour mettre à jour les filtres
  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    router.push(`/hr/payroll/preparation?${params.toString()}`);
  };

  const handleValidate = async (emp: any, results: any) => {
    const deduction = debtDeductions[emp.id] || 0;
    const finalNet = results.netBeforeDebt - deduction;
    setIsProcessing(emp.id);

    try {
      const { error } = await supabase.from('payslips').insert({
        employee_id: emp.id,
        month: parseInt(month),
        year: parseInt(year),
        base_salary_snapshot: emp.base_salary,
        transport_allowance_paid: results.netTransport,
        absences_deduction: results.salaryDeductions,
        bonuses_total: results.totalBonuses,
        debt_deduction: deduction,
        net_paid: finalNet,
        status: 'validated'
      });
      if (error) throw error;
      toast.success(`Paie validée pour ${emp.name}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRE DE FILTRES */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-[28px] border shadow-sm">
        <Select value={shopId} onValueChange={(val) => updateFilters("shopId", val)}>
            <SelectTrigger className="w-48 h-10 rounded-xl bg-muted/50 border-none font-bold text-xs">
                <MapPin size={14} className="mr-2" />
                <SelectValue placeholder="Boutique" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {shops.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
        </Select>

        <div className="flex items-center bg-muted/50 rounded-xl px-2 h-10 border">
            <Select value={String(month).padStart(2, '0')} onValueChange={(val) => updateFilters("month", val)}>
                <SelectTrigger className="w-32 border-none shadow-none font-bold text-xs bg-transparent">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <Select value={String(year)} onValueChange={(val) => updateFilters("year", val)}>
                <SelectTrigger className="w-24 border-none shadow-none font-bold text-xs bg-transparent text-rose-600">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* CONDITION DE GARDE-FOU */}
      {totalAttendancesCount === 0 ? (
        <Card className="p-20 text-center border-none shadow-sm rounded-[40px] bg-white">
            <SearchX size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-gray-900">Aucune donnée de présence</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                Impossible de calculer la paie pour cette période car aucun pointage n'a été importé ou validé.
            </p>
            <Button 
                variant="outline" 
                className="mt-6 rounded-xl font-bold"
                onClick={() => router.push('/hr/attendance/import')}
            >
                Importer les présences
            </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {initialEmployees.map((emp: any) => {
            const results = calculatePayrollRow(emp, emp.attendances, emp.employee_bonuses, emp.employee_debts);
            const isPaid = emp.payslips?.length > 0;
            const finalNet = isPaid ? emp.payslips[0].net_paid : results.netBeforeDebt - (debtDeductions[emp.id] || 0);

            return (
              <Card key={emp.id} className={`p-0 border-none shadow-sm rounded-[32px] bg-white overflow-hidden flex flex-col lg:flex-row ${isPaid ? 'opacity-60' : ''}`}>
                {/* Ligne identique à ton design précédent avec les calculs de results */}
                <div className="p-6 lg:w-1/4 border-r bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">
                            {emp.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-none mb-1">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{emp.shops?.name}</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-[10px] font-bold uppercase">
                        <div className="flex justify-between"><span>Base:</span> <span>{emp.base_salary}$</span></div>
                        <div className="flex justify-between text-rose-600"><span>Retenues:</span> <span>-{results.salaryDeductions}$</span></div>
                    </div>
                </div>

                <div className="p-6 flex-1 grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase italic">Transport</p>
                        <p className="text-xl font-black">{results.netTransport}$</p>
                        <p className="text-[9px] text-muted-foreground font-bold">{results.transportEligibleDays}j / 26</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase italic">Primes</p>
                        <p className="text-xl font-black">+{results.totalBonuses}$</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase italic">Dettes</p>
                        <Input 
                            type="number" disabled={isPaid}
                            className="h-8 text-xs font-bold bg-amber-50/30 border-amber-100"
                            placeholder="Déduire..."
                            onChange={(e) => setDebtDeductions({...debtDeductions, [emp.id]: parseFloat(e.target.value) || 0})}
                        />
                    </div>
                </div>

                <div className="p-6 lg:w-1/4 bg-gray-900 text-white flex flex-col justify-between">
                    <p className="text-[10px] font-black uppercase text-rose-400">Total Net</p>
                    <p className="text-3xl font-black">{finalNet.toLocaleString()}$</p>
                    <Button 
                        disabled={isPaid || isProcessing === emp.id}
                        onClick={() => handleValidate(emp, results)}
                        className={`w-full mt-4 h-9 rounded-xl font-bold text-[10px] uppercase ${isPaid ? 'bg-emerald-600' : 'bg-rose-600 hover:bg-rose-700'}`}
                    >
                        {isProcessing === emp.id ? <Loader2 className="animate-spin" /> : isPaid ? <CheckCircle2 /> : 'Valider Paie'}
                    </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}