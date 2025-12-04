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
  totalOnline: number;
  // Ajout des stats ici
  stats?: {
    femme: number;
    enfants: number;
    beauty: number;
  };
}

export default function PaymentCards({ 
  totalEspeces = 0,
  totalBanque = 0,
  totalMobileMoney = 0,
  transactionsBanque = 0,
  transactionsMobileMoney = 0,
  totalOnline = 0,
  // Valeurs par défaut pour éviter les crashs si stats est undefined
  stats = { femme: 0, enfants: 0, beauty: 0 } 
}: PaymentCardsProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- Carte principale - Espèces + Stats Catégories --- */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-400/50 rounded-2xl backdrop-blur-sm">
                  <DollarSign className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Caisse</h3>
                  <p className="text-blue-100 text-lg">Total Espèces</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-400/80 text-white text-lg px-4 py-2">
                Principal
              </Badge>
            </div>
            
            <div className="text-center py-2">
              <p className="text-5xl font-bold mb-2 tracking-tight">
                {totalEspeces.toLocaleString('fr-FR')} $
              </p>
            </div>

            {/* Section Stats : Femme / Enfant / Beauty */}
            <div className="mt-8 pt-6 border-t border-blue-400/50">
              <div className="grid grid-cols-3 gap-4 text-center">
                
                {/* Femme */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-blue-200 uppercase font-semibold mb-1">Femme</span>
                  <span className="text-xl font-bold">{stats.femme.toLocaleString('fr-FR')} $</span>
                </div>

                {/* Enfant */}
                <div className="flex flex-col items-center border-l border-blue-400/50">
                  <span className="text-xs text-blue-200 uppercase font-semibold mb-1">Enfants</span>
                  <span className="text-xl font-bold">{stats.enfants.toLocaleString('fr-FR')} $</span>
                </div>

                {/* Beauty */}
                <div className="flex flex-col items-center border-l border-blue-400/50">
                  <span className="text-xs text-blue-200 uppercase font-semibold mb-1">Beauty</span>
                  <span className="text-xl font-bold">{stats.beauty.toLocaleString('fr-FR')} $</span>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Autres Cartes (Banque, MM, Online) --- */}
        <div className="grid grid-cols-1 gap-4">
            {/* Carte Banque */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
              <CardContent className="py-6">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-400/50 rounded-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Banque</h3>
                            <p className="text-purple-100 text-xs">Virements reçus</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">
                        {totalBanque.toLocaleString('fr-FR')} $
                        </p>
                        <p className="text-purple-100 text-xs">
                        {transactionsBanque} transaction{transactionsBanque > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Carte Mobile Money */}
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
              <CardContent className="py-6">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-400/50 rounded-lg">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Mobile Money</h3>
                            <p className="text-green-100 text-xs">Airtel / Orange</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">
                        {totalMobileMoney.toLocaleString('fr-FR')} $
                        </p>
                        <p className="text-green-100 text-xs">
                        {transactionsMobileMoney} transaction{transactionsMobileMoney > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Carte Online */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
              <CardContent className="py-6">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-400/50 rounded-lg">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">ONL</h3>
                            <p className="text-orange-100 text-xs">Paiements Web</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">
                        {totalOnline.toLocaleString('fr-FR')} $
                        </p>
                        <p className="text-orange-100 text-xs">
                          {/* Note: Tu avais mis transactionsMobileMoney ici, j'ai laissé mais vérifie si tu as une variable spécifique pour Online */}
                        {transactionsMobileMoney} transaction{transactionsMobileMoney > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}