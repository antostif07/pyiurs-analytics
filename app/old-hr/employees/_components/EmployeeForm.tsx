// app/hr/employees/_components/EmployeeForm.tsx
"use client";

import { useForm, SubmitHandler, Resolver  } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save, Loader2, Link2, DollarSign, Briefcase, Phone, MapPin, Mail, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { employeeSchema, EmployeeFormValues } from "../_config/schema";
import { saveEmployee } from "../_actions/save-employee";

// UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

interface Props {
  initialData?: any;
  shops: any[];
  odooEmployees: Option[];
  odooProducts: Option[];
}

export default function EmployeeForm({ initialData, shops, odooEmployees, odooProducts }: Props) {
  const router = useRouter();
  
  const defaultValues: EmployeeFormValues = {
    id: initialData?.id,
    name: initialData?.name ?? "",
    matricule: initialData?.matricule ?? "",
    email: initialData?.email ?? "",
    shop_id: initialData?.shop_id ?? "",
    base_salary: Number(initialData?.base_salary ?? 0),
    transport_allowance: Number(initialData?.transport_allowance ?? 0),
    address: initialData?.address ?? "",
    service_phone: initialData?.service_phone ?? "",
    private_phone: initialData?.private_phone ?? "",
    employee_odoo_id: initialData?.employee_odoo_id ?? null,
    commission_product_ids: initialData?.commission_product_ids ?? [],
    is_active: initialData?.is_active ?? true,
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as Resolver<EmployeeFormValues>,
    defaultValues: defaultValues,
    // On ajoute ceci pour plus de sécurité
    mode: "onBlur", 
  });

  const { isSubmitting, errors } = form.formState;

  const onFormSubmit: SubmitHandler<EmployeeFormValues> = async (values: EmployeeFormValues) => {
    const result = await saveEmployee(values);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Employé enregistré avec succès");
      router.push('/hr/employees');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8 pb-20">
      {/* BARRE D'ACTIONS FLOATING (Pro UX) */}
      <div className="sticky top-20 z-20 flex items-center justify-between bg-slate-50/80 backdrop-blur-md py-4 rounded-2xl px-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft size={16} className="mr-2" /> Retour
        </Button>
        <Button 
          disabled={isSubmitting} 
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 shadow-lg shadow-rose-200"
        >
          {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
          Sauvegarder la fiche
        </Button>
      </div>

      <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] space-y-12">
        {/* SECTION 1 : ADMINISTRATIF */}
        <div className="space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-100 pb-4">
             <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Briefcase size={20}/></div>
             <h2 className="font-bold text-slate-800">Informations Administratives</h2>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={cn(errors.matricule && "text-rose-500")}>Matricule Interne</Label>
              <Input {...form.register("matricule")} placeholder="RH-001" className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white transition-all" />
              {errors.matricule && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.matricule.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Nom Complet du Collaborateur</Label>
              <Input {...form.register("name")} className="h-12 rounded-xl bg-slate-50 border-transparent" />
            </div>

            <div className="space-y-2">
              <Label>Affectation Boutique</Label>
              <Select onValueChange={(v) => form.setValue("shop_id", v)} defaultValue={form.getValues("shop_id")}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent text-slate-600">
                   <SelectValue placeholder="Choisir une boutique" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
               <Label>Liaison Odoo (Sync)</Label>
               <Select 
                 onValueChange={(v) => form.setValue("employee_odoo_id", parseInt(v))} 
                 defaultValue={form.getValues("employee_odoo_id")?.toString()}
               >
                <SelectTrigger className="h-12 rounded-xl bg-blue-50/50 border-blue-100 text-blue-700">
                   <div className="flex items-center gap-2">
                     <Link2 size={14} />
                     <SelectValue placeholder="Lier au profil ERP" />
                   </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {odooEmployees.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* SECTION 2 : FINANCIER */}
        <div className="space-y-6">
          <header className="flex items-center gap-3 border-b border-slate-100 pb-4">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20}/></div>
             <h2 className="font-bold text-slate-800">Contrat & Rémunération</h2>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
               <Label>Salaire de base ($)</Label>
               <Input type="number" {...form.register("base_salary")} className="h-12 rounded-xl bg-slate-50 border-transparent" />
            </div>
            <div className="space-y-2">
               <Label>Indemnité Transport ($)</Label>
               <Input type="number" {...form.register("transport_allowance")} className="h-12 rounded-xl bg-slate-50 border-transparent" />
            </div>
            <div className="md:col-span-2 space-y-2">
               <Label className="text-slate-400 italic">Produits Odoo suivis pour commissionnement</Label>
               <MultipleSelector
                  defaultOptions={odooProducts}
                  value={odooProducts.filter(p => form.watch("commission_product_ids")?.includes(parseInt(p.value)))}
                  onChange={(opts) => form.setValue("commission_product_ids", opts.map(o => parseInt(o.value)))}
                  placeholder="Sélectionner les articles..."
                  className="rounded-xl border-slate-100"
               />
            </div>
          </div>
        </div>
      </Card>
    </form>
  );
}

// Utilitaire pour fusionner les classes
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}