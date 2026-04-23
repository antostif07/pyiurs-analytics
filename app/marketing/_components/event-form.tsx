"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { 
  Facebook, 
  MessageCircle, 
  Megaphone, 
  DollarSign, 
  Type, 
  AlignLeft,
  Calendar as CalendarIcon,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

// --- 1. INTERFACE DE FORME ---
interface MarketingEventFormData {
  title: string;
  description: string;
  platform: 'facebook' | 'whatsapp' | 'organic';
  task_type: 'publication' | 'boost' | 'campaign';
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  date: string;
  time: string;
  budget: number;
}

export default function MarketingEventForm({ onSuccess }: { onSuccess: () => void }) {
    const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  // --- 2. INITIALISATION AVEC TYPES ---
  const { register, handleSubmit, setValue, watch, reset } = useForm<MarketingEventFormData>({
    defaultValues: {
      title: '',
      description: '',
      platform: 'facebook',
      task_type: 'publication',
      status: 'scheduled',
      date: format(new Date(), "yyyy-MM-dd"),
      time: "10:00",
      budget: 0
    }
  });

  const selectedPlatform = watch('platform');
  const selectedType = watch('task_type');

  const onSubmit = async (data: MarketingEventFormData) => {
    setIsLoading(true);
    try {
      // Construction de la date ISO pour Supabase
      const scheduledAt = new Date(`${data.date}T${data.time}:00`).toISOString();

      const { error } = await supabase.from('marketing_calendar').insert([{
        title: data.title,
        description: data.description,
        platform: data.platform,
        task_type: data.task_type,
        scheduled_at: scheduledAt,
        budget: data.budget,
        status: 'scheduled'
      }]);

      if (error) throw error;
      
      toast.success("Événement programmé avec succès");
      reset();
      onSuccess(); // Ferme le tiroir et rafraîchit
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
      {/* Titre */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Type className="w-3.5 h-3.5"/> Titre de l'action</Label>
        <Input 
          {...register("title", { required: true })} 
          placeholder="ex: Campagne Promo Ramadan" 
          className="rounded-xl border-slate-200"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><AlignLeft className="w-3.5 h-3.5"/> Description / Contenu</Label>
        <Textarea 
          {...register("description")} 
          placeholder="Détails de la publication ou de l'audience..." 
          className="rounded-xl min-h-[80px]"
        />
      </div>

      {/* Plateforme & Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Plateforme</Label>
          <Select onValueChange={(v: any) => setValue('platform', v)} defaultValue="facebook">
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facebook">Facebook Ads</SelectItem>
              <SelectItem value="whatsapp">WeShindi (WA)</SelectItem>
              <SelectItem value="organic">Instagram / Bio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type d'action</Label>
          <Select onValueChange={(v: any) => setValue('task_type', v)} defaultValue="publication">
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publication">Publication</SelectItem>
              <SelectItem value="boost">Boost Post</SelectItem>
              <SelectItem value="campaign">Campagne</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date & Heure */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5"/> Date</Label>
          <Input type="date" {...register("date", { required: true })} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Heure</Label>
          <Input type="time" {...register("time", { required: true })} className="rounded-xl" />
        </div>
      </div>

      {/* Budget (Conditionnel) */}
      {(selectedPlatform === 'facebook' && selectedType !== 'publication') && (
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
          <Label className="text-blue-700 font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Budget de l'opération ($)
          </Label>
          <Input 
            type="number" 
            {...register("budget")} 
            className="rounded-xl bg-white border-blue-200 focus:ring-blue-500" 
            placeholder="0.00"
          />
          <p className="text-[10px] text-blue-600 italic">Ce montant sera déduit de votre budget marketing global.</p>
        </div>
      )}

      <div className="pt-4">
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full rounded-xl h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">Programmation en cours...</span>
          ) : (
            <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
              Confirmer la programmation
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}