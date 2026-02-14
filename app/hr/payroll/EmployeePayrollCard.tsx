// app/hr/payroll/components/EmployeePayrollCard.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, AlertCircle, Printer, BadgeCheck, Loader2 } from "lucide-react";

export function EmployeePayrollCard({ emp, stats, deduction, onDeductionChange, onProcess, onPrintTransport, onPrintFull, isSaving }: any) {
    const totalNet = stats.netSalaryBeforeDebt - deduction;

    return (
        <Card className="p-0 border-none shadow-sm rounded-4xl bg-white overflow-hidden group border border-gray-100 transition-all hover:shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                {/* INFOS BASE */}
                <div className="lg:col-span-3 p-6 border-r border-gray-50 bg-gray-50/30">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs">
                            {emp.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.shops?.name || 'Site inconnu'}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span className="text-gray-400">Salaire Base</span>
                            <span className="text-gray-900">{emp.base_salary}$</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase text-red-500">
                            <span>Retenues Travail</span>
                            <span>-{stats.totalSalaryDeduction.toFixed(2)}$</span>
                        </div>
                    </div>
                </div>

                {/* TRANSPORT */}
                <div className="lg:col-span-3 p-6 border-r border-gray-50">
                    <div className="flex items-center gap-2 text-blue-600 mb-4 font-black uppercase text-[10px]">
                        <ArrowRightLeft size={16} /> Enveloppe Transport
                    </div>
                    <p className="text-2xl font-black text-blue-700">{stats.netTransport.toFixed(2)}$</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                        {stats.transportEligibleDays}j payés / 26
                    </p>
                    <Button variant="outline" size="sm" onClick={onPrintTransport} className="mt-4 w-full h-8 rounded-xl text-[9px] font-black border-blue-100 text-blue-600">
                        EXTRAIRE TRANSPORT
                    </Button>
                </div>

                {/* DETTES */}
                <div className="lg:col-span-3 p-6 border-r border-gray-50 bg-amber-50/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-amber-600 font-black uppercase text-[10px]">
                            <AlertCircle size={16} /> Dettes
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 text-[9px]">Restant: {emp.totalDebtRemaining}$</Badge>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Déduire :</span>
                        <Input 
                            type="number" 
                            className="h-6 border-none bg-transparent text-xs font-black text-amber-700 p-0"
                            value={deduction || ''}
                            onChange={(e) => onDeductionChange(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </div>

                {/* FINAL */}
                <div className="lg:col-span-3 p-6 bg-gray-900 text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Salaire Net</h4>
                        <p className="text-xs font-bold text-emerald-400">+{stats.totalBonuses}$</p>
                    </div>
                    <p className="text-3xl font-black text-white my-2">
                        {emp.isPaid ? emp.payslipData.net_paid.toLocaleString() : totalNet.toLocaleString()}$
                    </p>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                        <Button 
                            disabled={isSaving || emp.isPaid}
                            onClick={onProcess}
                            className={`col-span-4 h-9 rounded-xl text-[9px] font-black uppercase ${emp.isPaid ? 'bg-emerald-500' : 'bg-rose-600'}`}
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={14}/> : emp.isPaid ? <BadgeCheck size={16}/> : 'Valider'}
                        </Button>
                        <Button variant="outline" disabled={!emp.isPaid} onClick={onPrintFull} className="h-9 rounded-xl border-white/10 bg-white/5 p-0 text-white">
                            <Printer size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}