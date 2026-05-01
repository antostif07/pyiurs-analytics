// app/hr/shops/_components/ShopList.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Building2, Plus, Landmark, Store, X, Loader2, Save } from "lucide-react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopSchema, ShopFormValues } from "../_config/schema";
import { saveShop } from "../_actions/save-shop";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ShopList({ initialShops, odooCompanies }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);

  const openForm = (shop = null) => {
    setEditingShop(shop);
    setIsModalOpen(true);
  };

  return (
    <>
      <Button 
        onClick={() => openForm()}
        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6 h-12 shadow-lg shadow-rose-100 transition-all gap-2"
      >
        <Plus size={18} /> Nouvelle Boutique
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {initialShops.map((shop: any) => (
          <Card key={shop.id} className="p-6 border-none shadow-sm rounded-[2rem] bg-white group relative overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/50">
            <div className="flex items-start justify-between relative z-10">
              <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors rounded-2xl">
                <Store size={24} />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => openForm(shop)}
                className="rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-900"
              >
                <Edit2 size={16} />
              </Button>
            </div>

            <div className="mt-6 relative z-10">
              <h3 className="text-xl font-bold text-slate-900">{shop.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    shop.odoo_company_id ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                )}>
                  <Building2 size={12} />
                  {shop.odoo_company_id ? `Odoo ID: ${shop.odoo_company_id}` : "Non liée"}
                </div>
              </div>
            </div>
            <Landmark className="absolute -right-6 -bottom-6 text-slate-50 w-32 h-32 z-0 transition-transform group-hover:scale-110 group-hover:text-slate-100/50" />
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <ShopDialog 
          shop={editingShop} 
          odooCompanies={odooCompanies} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}

// Sous-composant pour le Modal (Plus propre)
function ShopDialog({ shop, odooCompanies, onClose }: any) {
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema) as Resolver<ShopFormValues>,
    defaultValues: {
      id: shop?.id,
      name: shop?.name || "",
      odoo_company_id: shop?.odoo_company_id || null,
    }
  });

  const onSubmit = async (values: ShopFormValues) => {
    const res = await saveShop(values);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Boutique enregistrée");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
           <h3 className="font-bold text-slate-900">{shop ? 'Éditer' : 'Créer'} la boutique</h3>
           <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X size={20}/></Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Désignation</Label>
            <Input 
                {...form.register("name")} 
                placeholder="ex: Boutique Centrale" 
                className="h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Compagnie Odoo Associée</Label>
            <select 
              {...form.register("odoo_company_id")}
              className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500/20 outline-none appearance-none"
            >
              <option value="">Aucune liaison</option>
              {odooCompanies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Button 
            disabled={form.formState.isSubmitting}
            className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 transition-all gap-2"
          >
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {shop ? 'Mettre à jour' : 'Enregistrer la boutique'}
          </Button>
        </form>
      </Card>
    </div>
  );
}