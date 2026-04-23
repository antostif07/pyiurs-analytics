'use client';
import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fr } from 'date-fns/locale';
import { MapPin, UserIcon, Printer, Loader2, ShieldCheck } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { generateAttendancePDF } from '../exportPDF';
import { STATUS_CONFIG, } from '../../utils';
import { AttendanceStatus } from '../types';
// import MonthlySummary from './MonthlySummary';
import { toast } from 'sonner';
import { fetchAttendances, updateAttendance } from '../_actions';
import { Attendance } from '@/lib/supabase/types';

// Types synchronisés avec Supabase
export interface EmployeeWithShop {
  id: string;
  name: string;
  shop_id: string;
  is_active: boolean;
  user_id?: string;
  shops?: {
    id: string;
    name: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  role: string;
  shop_id?: string;
}

interface AttendanceDashboardProps {
  shops: any[];
  initialEmployees: EmployeeWithShop[];
  currentUser: Profile | null;
}

export default function AttendanceDashboard({ 
  shops, 
  initialEmployees,
  currentUser
}: AttendanceDashboardProps) {
  // States
  const [employees] = useState(initialEmployees);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtres
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployees[0]?.id || ''
  );

  // Vérifier les permissions
  const canConfirm = useCallback((employeeUserId?: string) => {
    if (!currentUser) return false;
    // Manager peut confirmer, Admin peut tout, User ne peut que ses propres présences
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'manager') return true;
    return currentUser.id === employeeUserId;
  }, [currentUser]);

  const canValidate = useCallback((employeeShopId?: string) => {
    if (!currentUser) return false;
    // Admin peut tout valider
    if (currentUser.role === 'admin') return true;
    // Manager peut valider les employés de sa boutique
    if (currentUser.role === 'manager') {
      return currentUser.shop_id === employeeShopId;
    }
    return false;
  }, [currentUser]);

  // Optimisation des calculs
  const filteredEmployees = useMemo(() => {
    if (!employees.length) return [];
    return selectedShopId === "all" 
      ? employees 
      : employees.filter(e => e.shop_id === selectedShopId);
  }, [employees, selectedShopId]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2018 + 1 }, (_, i) => (currentYear - i).toString());
  }, []);

  const workingDaysAttendances = useMemo(() => {
    return attendances.filter(a => getDay(new Date(a.date)) !== 0);
  }, [attendances]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  const isFullyConfirmed = useMemo(() => {
    return workingDaysAttendances.length > 0 && 
           workingDaysAttendances.every(a => a.is_confirmed);
  }, [workingDaysAttendances]);

  const stats = useMemo(() => {
    return (Object.keys(STATUS_CONFIG) as AttendanceStatus[]).reduce((acc, statusKey) => {
      acc[statusKey] = workingDaysAttendances.filter(a => 
        (a.is_validated ? a.validated_status : a.status) === statusKey
      ).length;
      return acc;
    }, {} as any);
  }, [workingDaysAttendances]);

  // Charger les présences
  const loadAttendances = useCallback(async (employeeId: string, year: string, month: string) => {
    if (!employeeId) return;
    
    setLoading(true);
    try {
      const result = await fetchAttendances(employeeId, year, month);
      if (result.success) {
        setAttendances(result.data as any);
      } else {
        toast.warning("Erreur", {
          description: result.error,
        });
      }
    } catch (error: any) {
      toast.warning("Erreur", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Mettre à jour une ligne
  const handleUpdateLine = useCallback(async (id: string, updates: Partial<Attendance>) => {
    setUpdatingId(id);
    try {
      const result = await updateAttendance(id, updates);
      if (result.success) {
        // Mettre à jour localement
        setAttendances(prev => prev.map(att => 
          att.id === id ? { ...att, ...updates } : att
        ));
        toast.success("Succès", {
          description: "Présence mise à jour",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.warning("Erreur", {
        description: error.message,
      });
    } finally {
      setUpdatingId(null);
    }
  }, [toast]);

  // Validation en masse
  const handleBulkValidate = useCallback(async () => {
    const unvalidatedIds = workingDaysAttendances
      .filter(a => !a.is_validated)
      .map(a => a.id);
    
    if (!unvalidatedIds.length) return;
    
    setIsBulkLoading(true);
    // try {
    //   const result = await bulkValidateAttendances(unvalidatedIds);
    //   if (result.success) {
        // Mettre à jour localement
        // setAttendances(prev => prev.map(att => 
        //   unvalidatedIds.includes(att.id) 
        //     ? { ...att, is_validated: true, validated_at: new Date().toISOString(), validated_by: currentUser?.id }
        //     : att
        // ));
    //     toast.success("Succès", {
    //       description: `${unvalidatedIds.length} présences validées`,
    //     });
    //   } else {
    //     throw new Error(result.error);
    //   }
    // } catch (error: any) {
    //   toast.warning("Erreur", {
    //     description: error.message,
    //   });
    // } finally {
    //   setIsBulkLoading(false);
    // }
  }, [workingDaysAttendances, currentUser, toast]);

  // Générer PDF
  const handlePrintPDF = useCallback(() => {
    const emp = employeeMap.get(selectedEmployeeId);
    if (emp) {
      generateAttendancePDF(emp, attendances, selectedMonth, selectedYear, stats);
    }
  }, [employeeMap, selectedEmployeeId, attendances, selectedMonth, selectedYear, stats]);

  // Charger quand les filtres changent
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    loadAttendances(employeeId, selectedYear, selectedMonth);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (selectedEmployeeId) {
      loadAttendances(selectedEmployeeId, selectedYear, month);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (selectedEmployeeId) {
      loadAttendances(selectedEmployeeId, year, selectedMonth);
    }
  };

  const handleShopChange = (shopId: string) => {
    setSelectedShopId(shopId);
    // Réinitialiser l'employé sélectionné
    const newFilteredEmployees = shopId === "all" 
      ? employees 
      : employees.filter(e => e.shop_id === shopId);
    
    if (newFilteredEmployees.length > 0) {
      const newEmployeeId = newFilteredEmployees[0].id;
      setSelectedEmployeeId(newEmployeeId);
      loadAttendances(newEmployeeId, selectedYear, selectedMonth);
    }
  };

  // Chargement initial
  useState(() => {
    if (selectedEmployeeId) {
      loadAttendances(selectedEmployeeId, selectedYear, selectedMonth);
    }
  });

  // Rendu des statistiques
  const StatsDisplay = useMemo(() => {
    if (!workingDaysAttendances.length) return null;
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {stats[key as AttendanceStatus] || 0}
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1">
              {config.label}
            </div>
          </div>
        ))}
      </div>
    );
  }, [workingDaysAttendances.length, stats]);

  return (
    <div className="space-y-6">
      <Card className="p-3 lg:py-3 lg:px-5 border-none shadow-sm rounded-2xl bg-white">
        <div className="flex flex-col lg:flex-row gap-3 items-center">
          {/* Filtres */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-full lg:w-auto border border-gray-100">
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full lg:w-27.5 h-8 border-none bg-transparent font-bold text-xs shadow-none focus:ring-0 uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i} value={String(i + 1).padStart(2, '0')} className="text-xs">
                    {format(new Date(2025, i, 1), 'MMMM', { locale: fr })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-gray-200 hidden lg:block mx-1" />
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-full lg:w-20 h-8 border-none bg-transparent font-bold text-rose-600 text-xs shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year} className="text-xs">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={selectedShopId} onValueChange={handleShopChange}>
            <SelectTrigger className="w-full lg:w-48 h-10 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-xs">
              <MapPin size={14} className="mr-2 text-gray-400" />
              <SelectValue placeholder="Boutique" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tous les sites</SelectItem>
              {shops.map(shop => (
                <SelectItem key={shop.id} value={shop.id} className="text-xs">
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 w-full">
            <Select 
              value={selectedEmployeeId} 
              onValueChange={handleEmployeeChange}
              disabled={filteredEmployees.length === 0}
            >
              <SelectTrigger className="w-full h-10 rounded-xl border-gray-100 bg-gray-50/50 font-bold text-xs uppercase italic tracking-tighter">
                <UserIcon size={14} className="mr-2 text-gray-400" />
                <SelectValue placeholder={filteredEmployees.length === 0 ? "Aucun employé" : "Employé"} />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees.map(e => (
                  <SelectItem key={e.id} value={e.id} className="text-xs uppercase font-bold tracking-tighter italic">
                    {e.name} 
                    <span className="ml-2 text-[9px] text-gray-400 font-normal">
                      ({e.shops?.name})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrintPDF} 
              disabled={!isFullyConfirmed || !selectedEmployeeId} 
              className="h-9 rounded-xl border-gray-200 text-gray-700 font-bold text-[10px] uppercase"
            >
              <Printer size={14} className="mr-2" /> PDF
            </Button>
            <Button 
              size="sm" 
              disabled={isBulkLoading || !selectedEmployeeId || workingDaysAttendances.every(a => a.is_validated)} 
              onClick={handleBulkValidate}
              className="h-9 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest px-4"
            >
              {isBulkLoading && <Loader2 size={14} className="mr-2 animate-spin" />}
              Tout Valider
            </Button>
          </div>
        </div>
        
        {!loading && StatsDisplay}
      </Card>
      
      {/* Tableau des présences */}
      <Card className="border-none shadow-sm rounded-4xl bg-white overflow-hidden min-h-125">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Chargement des présences...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Jour</th>
                  <th className="px-4 py-4 text-center">Arrivée</th>
                  <th className="px-4 py-4 text-center">Départ</th>
                  <th className="px-4 py-4 text-center">Source</th>
                  <th className="px-4 py-4">Status Retenu</th>
                  <th className="px-4 py-4">Observations</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {workingDaysAttendances.map((row) => {
                  const emp = employeeMap.get(row.employee_id);
                  const isUpdating = updatingId === row.id;
                  
                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-gray-50/50 transition-colors h-11 ${
                        row.is_validated ? 'bg-emerald-50/20' : ''
                      } ${row.is_confirmed ? 'border-l-2 border-l-emerald-400' : ''}`}
                    >
                      <td className="px-6 py-1 font-bold text-gray-500 text-[11px] italic">
                        {format(new Date(row.date), 'dd eee', { locale: fr })}
                      </td>
                      <td className="px-4 py-1 text-center font-mono font-bold text-gray-900 text-[11px]">
                        {/* {row.check_in ? format(new Date(row.check_in), 'HH:mm') : '—'} */}
                      </td>
                      {/* <td className="px-4 py-1 text-center font-mono font-bold text-gray-900 text-[11px]">
                        {row.check_out ? format(new Date(row.check_out), 'HH:mm') : '—'}
                      </td> */}
                      <td className="px-4 py-1 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase ${
                          row.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                          row.status === 'absent' ? 'bg-red-100 text-red-700' :
                          row.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        //   row.status === 'holiday' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {/* {row.status && (STATUS_CONFIG[row.status]?.label || row.status)} */}
                        </span>
                      </td>
                      <td className="px-4 py-1">
                        <Select 
                          disabled={row.is_validated || isUpdating}
                          value={row.validated_status || (row.status ?? "")} 
                          onValueChange={(val) => handleUpdateLine(row.id, { validated_status: val as any })}
                        >
                          <SelectTrigger className="h-7 rounded-lg border-gray-100 bg-gray-50 font-bold text-[9px] min-w-32.5 shadow-none uppercase italic">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-100">
                            {/* {STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.val} value={opt.val} className="text-[10px] font-bold uppercase italic">
                                {opt.label}
                              </SelectItem>
                            ))} */}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-1">
                        <Input 
                          disabled={row.is_validated || isUpdating}
                          placeholder="Justification..." 
                          className="h-7 rounded-lg border-transparent bg-gray-50/50 text-[10px] focus:bg-white transition-all shadow-none italic font-medium"
                          defaultValue={row.observation || ''}
                          onBlur={(e) => handleUpdateLine(row.id, { observation: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-1 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm" 
                            variant="ghost"
                            disabled={row.is_confirmed || !canConfirm(emp?.user_id) || isUpdating}
                            onClick={() => handleUpdateLine(row.id, { 
                              is_confirmed: true, 
                              confirmed_by: currentUser?.id 
                            })}
                            className={`h-7 px-2 rounded-lg text-[9px] font-black uppercase ${
                              row.is_confirmed 
                                ? 'text-emerald-600 bg-emerald-50' 
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            }`}
                          >
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : row.is_confirmed ? 'Confirmé' : 'Confirmer'}
                          </Button>
                          <Button
                            size="sm"
                            disabled={row.is_validated || !canValidate(emp?.shop_id) || isUpdating}
                            onClick={() => handleUpdateLine(row.id, { 
                              is_validated: true, 
                              validated_by: currentUser?.id, 
                              validated_status: row.validated_status || row.status,
                            //   validated_at: new Date().toISOString()
                            })}
                            className={`h-7 px-2 rounded-lg text-[9px] font-black uppercase ${
                              row.is_validated 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-rose-600 text-white hover:bg-rose-700'
                            }`}
                          >
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : row.is_validated ? <ShieldCheck size={12} /> : 'Valider'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {workingDaysAttendances.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-sm text-gray-400">Aucune présence enregistrée pour cette période</p>
              </div>
            )}
          </div>
        )}
      </Card>
      
      {/* {!loading && workingDaysAttendances.length > 0 && (
        <MonthlySummary attendances={workingDaysAttendances} />
      )} */}
    </div>
  );
}