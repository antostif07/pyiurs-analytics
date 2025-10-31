// components/cloture-vente/negative-sale-justification-modal.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { POSOrder } from "@/app/types/pos"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface NegativeSaleJustificationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (justificationText: string) => void
  sale: POSOrder
  isLoading?: boolean
  existingJustification?: string
}

export function NegativeSaleJustificationModal({
  isOpen,
  onClose,
  onSave,
  sale,
  isLoading = false,
  existingJustification
}: NegativeSaleJustificationModalProps) {
  const [justification, setJustification] = useState(existingJustification || '')

  const handleSave = () => {
    if (justification.trim()) {
      onSave(justification.trim())
      setJustification('')
    }
  }

  const handleClose = () => {
    setJustification(existingJustification || '')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 Justifier la vente négative
            <Badge variant="destructive">Montant: {sale.amount_total?.toLocaleString('fr-FR')} $</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations sur la vente */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-semibold text-red-900 text-sm mb-2">Détails de la vente</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-red-700 font-medium">Commande:</span>
                <div className="text-red-900">#{sale.id}</div>
              </div>
              <div>
                <span className="text-red-700 font-medium">Date:</span>
                <div className="text-red-900">{format(new Date(sale.create_date), 'dd/MM/yyyy HH:mm')}</div>
              </div>
              <div className="col-span-2">
                <span className="text-red-700 font-medium">Boutique:</span>
                <div className="text-red-900">
                  {sale.config_id && typeof sale.config_id === 'object' ? sale.config_id[1] : 'Non spécifiée'}
                </div>
              </div>
            </div>
          </div>

          {/* Champ de justification */}
          <div className="space-y-2">
            <Label htmlFor="justification" className="text-sm font-medium">
              Justification <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Expliquez la raison de cette vente négative (remboursement, erreur de saisie, annulation, etc.)..."
              className="min-h-32 resize-none focus:ring-2 focus:ring-red-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Cette justification sera enregistrée avec la clôture et visible par le financier.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!justification.trim() || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Enregistrement...' : existingJustification ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}