import { DollarSign, FileText, TrendingUp, CreditCard } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

interface PaymentCardsProps {
  totalEspeces: number;
  totalBanque: number;
  totalMobileMoney: number;
  totalCarte: number;
  transactionsBanque: number;
  transactionsMobileMoney: number;
  transactionsCarte: number;
}

export default function PaymentCards({ 
  totalEspeces = 0,
  totalBanque = 0,
  totalMobileMoney = 0,
  totalCarte = 0,
  transactionsBanque = 0,
  transactionsMobileMoney = 0,
  transactionsCarte = 0
}: PaymentCardsProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte principale - Espèces (plus grande et plus visible) */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-400 rounded-2xl">
                  <DollarSign className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Espèces</h3>
                  <p className="text-blue-100 text-lg">Total en caisse</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-400 text-white text-lg px-4 py-2">
                Principal
              </Badge>
            </div>
            
            <div className="text-center py-4">
              <p className="text-5xl font-bold mb-2">
                {totalEspeces.toLocaleString('fr-FR')} $
              </p>
              <p className="text-blue-100 text-xl">
                Montant total espèces
              </p>
            </div>

            {/* Indicateur visuel */}
            <div className="mt-6 pt-4 border-t border-blue-400">
              <div className="flex justify-between items-center text-blue-100">
                <span className="text-lg">Disponible en caisse</span>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-lg">Enregistré</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-2">
            {/* Carte Banque */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
          <CardContent>
            <div className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-400 rounded-lg">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Banque</h3>
                        <p className="text-purple-100 text-sm">Virements</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-center">
                        <p className="text-3xl font-bold mb-1">
                        {totalBanque.toLocaleString('fr-FR')} $
                        </p>
                        <p className="text-purple-100 text-sm">
                        {transactionsBanque} transaction{transactionsBanque > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <CardContent className="">
            <div className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-400 rounded-lg">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Mobile Money</h3>
                        <p className="text-green-100 text-sm">Paiements mobiles</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-center">
                        <p className="text-3xl font-bold mb-1">
                        {totalMobileMoney.toLocaleString('fr-FR')} $
                        </p>
                        <p className="text-green-100 text-sm">
                        {transactionsMobileMoney} transaction{transactionsMobileMoney > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
          <CardContent className="">
            <div className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-400 rounded-lg">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">ONL</h3>
                        <p className="text-orange-100 text-sm">Paiements Online</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-center">
                        <p className="text-3xl font-bold mb-1">
                        {totalMobileMoney.toLocaleString('fr-FR')} $
                        </p>
                        <p className="text-green-100 text-sm">
                        {transactionsMobileMoney} transaction{transactionsMobileMoney > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}