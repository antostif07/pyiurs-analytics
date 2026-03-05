import { DollarSign, FileText, TrendingUp, CreditCard } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { POSConfig, POSOrder } from "@/app/types/pos";
import { POSOrderLineExtra } from "@/app/cloture-vente/actions";
interface PaymentCardsProps {
  totalEspeces: number;
  totalBanque: number;
  totalMobileMoney: number;
  totalCarte: number;
  transactionsCash: number;
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
  sales: POSOrderLineExtra[];
  shops: POSConfig[]
}

export default function PaymentCards({ 
  totalEspeces = 0,
  totalBanque = 0,
  totalMobileMoney = 0,
  transactionsBanque = 0,
  transactionsMobileMoney = 0,
  totalOnline = 0,
  // Valeurs par défaut pour éviter les crashs si stats est undefined
  stats = { femme: 0, enfants: 0, beauty: 0 },
  sales,
  shops,
  transactionsCash
}: PaymentCardsProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- Carte principale - Espèces + Stats Catégories --- */}
        <Card className="lg:col-span-1 bg-linear-to-br from-blue-600 to-blue-700 text-white shadow-2xl border-0 overflow-hidden">
  <CardContent className="p-8">

    {/* HEADER */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/15 rounded-xl backdrop-blur">
          <DollarSign className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-xl font-semibold tracking-wide">
            Caisse
          </h3>
          <p className="text-sm text-blue-100">
            Revenus par magasin et catégorie
          </p>
        </div>
      </div>

      <Badge className="bg-white/20 text-white px-4 py-1 text-sm font-semibold">
        Aujourd’hui
      </Badge>
    </div>

    {/* TOTAL GLOBAL */}
    <div className="mb-6">
      <p className="text-sm text-blue-200">Total général</p>
      <p className="text-4xl font-bold">
        {sales
          .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)
          .toLocaleString("fr-FR")} $
      </p>
    </div>


    {/* TABLE MATRICE */}
    <div className="overflow-hidden rounded-lg border border-white/20">

      {/* HEADER */}
      <div className="grid grid-cols-5 bg-white/10 text-xs uppercase text-blue-200 font-semibold px-4 py-3">
        <div>Shop</div>
        <div className="text-right">Femme</div>
        <div className="text-right">Enfants</div>
        <div className="text-right">Beauty</div>
        <div className="text-right">Total</div>
      </div>

      {/* ROWS */}
      {shops
        .filter(s => s.id !== 9 && s.id !== 21 && s.id !== 11)
        .map((shop) => {
          const shopSales = sales.filter(
            (posOrderLine: POSOrderLineExtra) => posOrderLine.order!.config_id[0] === shop.id
          )

          const femme = shopSales.filter(ss => ss.product?.x_studio_segment === "Femme")
            .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)

          const enfants = shopSales.filter(ss => ss.product?.x_studio_segment === "Enfant")
            .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)

          const beauty = shopSales.filter(ss => ss.product?.x_studio_segment === "Beauty")
            .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)

          const total = femme + enfants + beauty

          return (
            <div
              key={shop.id}
              className="grid grid-cols-5 px-4 py-3 border-t border-white/10 text-sm hover:bg-white/5 transition"
            >
              <div className="font-medium text-blue-100">
                {shop.name}
              </div>

              <div className="text-right">
                {femme.toLocaleString("fr-FR")} $
              </div>

              <div className="text-right">
                {enfants.toLocaleString("fr-FR")} $
              </div>

              <div className="text-right">
                {beauty.toLocaleString("fr-FR")} $
              </div>

              <div className="text-right font-semibold">
                {total.toLocaleString("fr-FR")} $
              </div>
            </div>
          )
        })}

        <div className="grid grid-cols-5 bg-white/10 text-xs uppercase text-blue-200 font-semibold px-4 py-3">
          <div>Total Segment</div>
          <div className="text-right">{
            sales.filter(ss => ss.product?.x_studio_segment === "Femme")
            .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)
          } $</div>
          <div className="text-right">{
            sales.filter(ss => ss.product?.x_studio_segment === "Enfant")
            .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)
          } $</div>
          <div className="text-right">{
            sales.filter(ss => ss.product?.x_studio_segment === "Beauty")
            .reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)
          } $</div>
          <div className="text-right">{
            sales.reduce((acc: number, curr: POSOrderLineExtra) => acc + curr.price_subtotal_incl, 0)
          } $</div>
        </div>

    </div>


    {/* TOTAL PAR CATÉGORIE */}
    {/* <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-3 text-center">

      <div>
        <p className="text-xs text-blue-200 uppercase">Femme</p>
        <p className="text-lg font-bold">
          {stats.femme.toLocaleString("fr-FR")} $
        </p>
      </div>

      <div>
        <p className="text-xs text-blue-200 uppercase">Enfants</p>
        <p className="text-lg font-bold">
          {stats.enfants.toLocaleString("fr-FR")} $
        </p>
      </div>

      <div>
        <p className="text-xs text-blue-200 uppercase">Beauty</p>
        <p className="text-lg font-bold">
          {stats.beauty.toLocaleString("fr-FR")} $
        </p>
      </div>

    </div> */}

  </CardContent>
</Card>

        {/* --- Autres Cartes (Banque, MM, Online) --- */}
        <div className="grid grid-cols-1 gap-4">
          {/* CASH */}
          <Card className="bg-linear-to-br from-purple-600 to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl transition">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/15 rounded-xl backdrop-blur">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-sm text-purple-100 font-medium">Cash</p>
                    <p className="text-xs text-purple-200">
                      Paiements espèces
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {totalEspeces.toLocaleString('fr-FR')} $
                  </p>
                  <p className="text-xs text-purple-200">
                    {transactionsCash} transaction{transactionsCash > 1 ? 's' : ''}
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* BANQUE */}
          <Card className="bg-linear-to-br from-indigo-600 to-indigo-700 text-white border-0 shadow-xl hover:shadow-2xl transition">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/15 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-sm text-indigo-100 font-medium">Banque</p>
                    <p className="text-xs text-indigo-200">
                      Virements reçus
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {totalBanque.toLocaleString('fr-FR')} $
                  </p>
                  <p className="text-xs text-indigo-200">
                    {transactionsBanque} transaction{transactionsBanque > 1 ? 's' : ''}
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* MOBILE MONEY */}
          <Card className="bg-linear-to-br from-green-600 to-green-700 text-white border-0 shadow-xl hover:shadow-2xl transition">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/15 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-sm text-green-100 font-medium">Mobile Money</p>
                    <p className="text-xs text-green-200">
                      Airtel / Orange
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {totalMobileMoney.toLocaleString('fr-FR')} $
                  </p>
                  <p className="text-xs text-green-200">
                    {transactionsMobileMoney} transaction{transactionsMobileMoney > 1 ? 's' : ''}
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* ONLINE */}
          <Card className="bg-linear-to-br from-orange-600 to-orange-700 text-white border-0 shadow-xl hover:shadow-2xl transition">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/15 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>

                  <div>
                    <p className="text-sm text-orange-100 font-medium">Online</p>
                    <p className="text-xs text-orange-200">
                      Paiements Web
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {totalOnline.toLocaleString('fr-FR')} $
                  </p>
                  <p className="text-xs text-orange-200">
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