import { DollarSign, Minus, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";

export const BilleterieCard = ({ denominations, decrement, increment, totals }: any) => (
  <Card className="h-fit">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <DollarSign className="w-5 h-5" /> Billeterie
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* USD Section */}
      <div>
        <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div> USD
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {denominations.filter((d: any) => d.currency === 'USD').map((denomination: any, index: number) => (
            <div key={denomination.value} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm hover:border-green-300 transition-colors">
              <span className="text-sm font-semibold text-gray-800">{denomination.value}$</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => decrement(index)} disabled={denomination.quantity === 0}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-bold">{denomination.quantity}</span>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => increment(index)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CDF Section */}
      <div>
        <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div> CDF
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {denominations.filter((d: any) => d.currency === 'CDF').map((denomination: any) => {
            const globalIndex = denominations.findIndex((d: any) => d.currency === 'CDF' && d.value === denomination.value)
            return (
              <div key={denomination.value} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm hover:border-blue-300 transition-colors">
                <span className="text-sm font-semibold text-gray-800">{denomination.value.toLocaleString('fr-FR')}FC</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => decrement(globalIndex)} disabled={denomination.quantity === 0}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-bold">{denomination.quantity}</span>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => increment(globalIndex)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Résumé */}
      <div className="pt-4 border-t bg-slate-50 p-4 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-600">Total USD:</span>
          <span className="font-bold text-green-600">{totals.usd.toLocaleString('fr-FR')} $</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="font-medium text-gray-600">Total CDF:</span>
          <span className="font-bold text-blue-600">{totals.cdf.toLocaleString('fr-FR')} FC</span>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t font-semibold">
          <span className="text-gray-700">Cash Physique Total:</span>
          <span className="text-purple-600 text-lg">{totals.calculated.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $</span>
        </div>
      </div>
    </CardContent>
  </Card>
);