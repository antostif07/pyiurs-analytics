'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Calendar, ExternalLink } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { Expense } from '@/app/types/cloture'

interface ChargeRowProps {
  chargeData: {
    total: number
    count: number
    name: string
    expenses: Expense[]
  }
  chargeId: string
}

export function ChargeRow({ chargeData }: ChargeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-b last:border-b-0">
      {/* Ligne principale avec meilleur design */}
      <div 
        className="grid grid-cols-2 gap-4 px-6 py-4 cursor-pointer hover:bg-blue-50 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'text-blue-500' : 'group-hover:text-blue-500'
          }`}>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{chargeData.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs font-normal">
                  {chargeData.count} dépense{chargeData.count > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg text-red-600">
            {chargeData.total.toLocaleString('fr-FR')} $
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Moyenne: {(chargeData.total / chargeData.count).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
          </div>
        </div>
      </div>

      {/* Section détaillée avec animation */}
      {isExpanded && (
  <div className="bg-gray-25 border-t animate-in fade-in duration-200">
    <div className="px-14 py-4">
      <div className="mb-3">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">Détails des dépenses</h4>
      </div>
      <div className="space-y-2">
        {chargeData.expenses.map((expense) => (
          <div 
            key={expense.id} 
            className="flex justify-between items-center p-3 rounded-lg border bg-white hover:shadow-md transition-all cursor-pointer hover:bg-blue-50 group"
            onClick={() => window.open(`https://pyiurs.odoo.com/web?#id=${expense.id}&cids=5&menu_id=367&action=549&model=hr.expense&view_type=form`, '_blank')}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="font-medium text-sm text-gray-900 group-hover:text-blue-700">
                  {expense.name || 'Dépense non décrite'}
                </p>
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>
                  {expense.create_date ? format(new Date(expense.create_date), 'dd/MM/yyyy HH:mm') : 'Date non spécifiée'} - {expense.product_id[1]}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-red-600 text-sm">
                {(expense.total_amount || 0).toLocaleString('fr-FR')} $
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
    </div>
  )
}