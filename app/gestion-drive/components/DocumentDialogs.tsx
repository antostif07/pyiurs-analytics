'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

interface DocumentDialogsProps {
  mode: 'edit' | 'duplicate' | null;
  onClose: () => void;
  onConfirm: () => void;
  formData: { name: string; withData: boolean };
  setFormData: (data: any) => void;
  isProcessing: boolean;
}

export function DocumentDialogs({ mode, onClose, onConfirm, formData, setFormData, isProcessing }: DocumentDialogsProps) {
  return (
    <Dialog open={mode !== null} onOpenChange={onClose}>
      <DialogContent className="rounded-[40px] p-8 max-w-md border-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
            {mode === 'edit' ? 'Renommer le document' : 'Dupliquer l\'espace'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Titre du document</Label>
            <Input 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              className="h-12 rounded-2xl bg-gray-50 border-none font-bold focus-visible:ring-rose-500/20" 
            />
          </div>

          {mode === 'duplicate' && (
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.withData} 
                  onChange={(e) => setFormData({...formData, withData: e.target.checked})} 
                  className="w-4 h-4 accent-rose-600 rounded" 
                />
                <span className="text-xs font-bold text-rose-900 italic">Copier également tout le contenu</span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold h-12 px-6">Annuler</Button>
          <Button 
            onClick={onConfirm} 
            disabled={isProcessing || !formData.name}
            className="bg-gray-900 hover:bg-black text-white rounded-xl h-12 px-8 font-bold min-w-35"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}