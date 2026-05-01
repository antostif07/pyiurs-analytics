"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertEmployee } from "../actions";
import { employeeSchema, EmployeeFormValues } from "../schema";
import { InsertEmployee } from "@/lib/supabase/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shops: { id: string, name: string }[];
  initialData?: any;
}

export default function EmployeeFormDrawer({ isOpen, onClose, shops, initialData }: Props) {
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { is_active: true, base_salary: 0 }
  });

  // Reset le formulaire quand les données initiales changent ou à l'ouverture
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
        // On log pour vérifier ce que contient réellement initialData
        console.log("Preremplissage avec :", initialData);

        reset({
            id: initialData.id,
            name: initialData.name || "",
            matricule: initialData.matricule || "",
            email: initialData.email || "",
            job_title: initialData.job_title || "",
            department: initialData.department || "",
            // On s'assure que shop_id est bien une string pour le <select>
            shop_id: initialData.shop_id || initialData.shops?.id || "", 
            base_salary: initialData.base_salary !== null ? Number(initialData.base_salary) : 0,
            transport_allowance: initialData.transport_allowance !== null ? Number(initialData.transport_allowance) : 0,
            // On force le booléen pour la checkbox
            is_active: Boolean(initialData.is_active),
        });
        } else {
        reset({
            name: "",
            matricule: "",
            email: "",
            job_title: "",
            department: "",
            shop_id: "",
            base_salary: 0,
            transport_allowance: 0,
            is_active: true,
        });
        }
    }
    }, [initialData, reset, isOpen, shops]); 

  const mutation = useMutation({
    mutationFn: (data: EmployeeFormValues) => upsertEmployee(data as InsertEmployee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onClose();
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{initialData?.id ? "Modifier l'agent" : "Nouvel Agent"}</h2>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form id="emp-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom complet</label>
                <input {...register("name")} className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="ex: Jean Dupont" />
                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Matricule</label>
                  <input {...register("matricule")} className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
                  {errors.matricule && <p className="text-xs text-red-500">{errors.matricule.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Affectation (Boutique)</label>
                  <select {...register("shop_id")} className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Choisir...</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.shop_id && <p className="text-xs text-red-500">{errors.shop_id.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email professionnel</label>
                <input {...register("email")} className="w-full p-2 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Poste</label>
                  <input {...register("job_title")} className="w-full p-2 rounded-md border bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Département</label>
                  <input {...register("department")} className="w-full p-2 rounded-md border bg-background" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Rémunération (Mensuelle)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <label className="text-sm font-medium">Salaire de Base</label>
                    <div className="relative">
                        <input 
                        type="number" 
                        {...register("base_salary")} 
                        className="w-full p-2 pl-8 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none" 
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    </div>
                    {errors.base_salary && <p className="text-xs text-red-500">{errors.base_salary.message}</p>}
                    </div>

                    <div className="space-y-2">
                    <label className="text-sm font-medium">Indemnité Transport</label>
                    <div className="relative">
                        <input 
                        type="number" 
                        {...register("transport_allowance")} 
                        className="w-full p-2 pl-8 rounded-md border bg-background focus:ring-2 focus:ring-primary/20 outline-none" 
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    </div>
                    {errors.transport_allowance && <p className="text-xs text-red-500">{errors.transport_allowance.message}</p>}
                    </div>
                </div>
                </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <input type="checkbox" {...register("is_active")} id="is_active" className="w-4 h-4 rounded border-gray-300 text-primary" />
                <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">L'agent est actuellement en poste (Actif)</label>
              </div>
            </form>

            <div className="p-6 border-t bg-muted/20 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-md hover:bg-muted transition-colors font-medium">Annuler</button>
              <button 
                form="emp-form" type="submit" disabled={mutation.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {initialData?.id ? "Mettre à jour" : "Enregistrer"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}