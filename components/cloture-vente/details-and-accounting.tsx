import { DollarSign, FileText, Minus, Plus, Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client";
import { format } from "date-fns";
import { Expense } from "@/app/types/cloture";
import { ChargeRow } from "./charge-row";

interface DetailsAndAccountingProps {
    denominations: {
        currency: 'USD' | 'CDF';
        value: number;
        label: string;
        quantity: number;
    }[];
    decrementDenomination: (index: number) => void;
    incrementDenomination: (index: number) => void;
    initialData: CloturePageDataType;
}

export default function DetailsAndAccounting({denominations, decrementDenomination, incrementDenomination, initialData}: DetailsAndAccountingProps) {
  return (
    <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Accordéon Détails des Ventes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Détails des Ventes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sales-details">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Ventes du jour ({initialData.sales.length})</span>
                        <Badge variant="secondary" className="ml-2">
                          Total: {initialData.dailySalesTotal.toLocaleString('fr-FR')} $
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {initialData.sales.map((sale) => (
                          <div key={sale.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                            <div className="flex-1">
                              <p className="font-medium text-sm">Commande #{sale.id}</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(sale.create_date), 'HH:mm')} • 
                                {sale.config_id && typeof sale.config_id === 'object' ? sale.config_id[1] : 'Boutique'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                {(sale.amount_total || 0).toLocaleString('fr-FR')} $
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {sale.payments ? sale.payments[0].payment_method_id[1] : 'Espèces'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Accordéon Dépenses Groupées par Charge - Version Compacte */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Dépenses du Jour
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {initialData.expenses.length > 0 ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 px-6 py-3 bg-slate-50 border-b font-semibold text-sm">
                        <div>Charge</div>
                        <div className="text-right">Montant</div>
                        </div>

                        {/* Groupes par charge */}
                        {Object.entries(
                        initialData.expenses.reduce((acc: {[key: string]: {
                            total: number, 
                            count: number, 
                            name: string, 
                            expenses: Expense[]
                        }}, expense) => {
                            const chargeId = (typeof expense.account?.x_studio_categorie_compte === "string") ? expense.account?.x_studio_categorie_compte : 'non-classe';
                            const chargeName = (typeof expense.account?.x_studio_categorie_compte === "string") ? expense.account?.x_studio_categorie_compte : 'Dépenses non classées';
                            
                            if (!acc[chargeId]) {
                            acc[chargeId] = { 
                                total: 0, 
                                count: 0, 
                                name: chargeName,
                                expenses: []
                            };
                            }
                            
                            acc[chargeId].total += expense.total_amount || 0;
                            acc[chargeId].count += 1;
                            acc[chargeId].expenses.push(expense);
                            
                            return acc;
                        }, {})
                        ).map(([chargeId, chargeData]) => (
                        <ChargeRow 
                            key={chargeId}
                            chargeData={chargeData}
                            chargeId={chargeId}
                        />
                        ))}

                        {/* Total général */}
                        <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-slate-100 border-t font-bold">
                        <div className="flex items-center gap-2">
                            <span>Total Général</span>
                            <Badge variant="destructive">
                            {initialData.expenses.length} dépense{initialData.expenses.length > 1 ? 's' : ''}
                            </Badge>
                        </div>
                        <div className="text-right text-red-600">
                            {initialData.expensesTotal.toLocaleString('fr-FR')} $
                        </div>
                        </div>
                    </div>
                    ) : (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Aucune dépense enregistrée pour cette journée</p>
                    </div>
                    )}
                </CardContent>
            </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Billeterie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* USD */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">USD</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {denominations.filter(d => d.currency === 'USD').map((denomination, index) => (
                        <div key={denomination.value} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium">{denomination.value}$</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => decrementDenomination(index)}
                              disabled={denomination.quantity === 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{denomination.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => incrementDenomination(index)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* CDF */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">CDF</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {denominations.filter(d => d.currency === 'CDF').map((denomination) => {
                        const globalIndex = denominations.findIndex(d => d.currency === 'CDF' && d.value === denomination.value)
                        return (
                          <div key={denomination.value} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">{denomination.value.toLocaleString('fr-FR')}FC</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => decrementDenomination(globalIndex)}
                                disabled={denomination.quantity === 0}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-bold">{denomination.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => incrementDenomination(globalIndex)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne centrale et droite : Accordéons */}
          <div className="lg:col-span-1 space-y-6">

            {/* Résultat de la Clôture et Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Résultat de la Clôture */}
              <Card>
                <CardHeader>
                  <CardTitle>Résultat de la Clôture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Cash théorique attendu</p>
                      <p className="text-xl font-bold text-blue-600">
                        {/* {initialData.expectedCash.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $ */}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cash physique calculé</p>
                      <p className="text-xl font-bold text-green-600">
                        {/* {calculations.calculatedCash.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $ */}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold">Différence</p>
                      {/* <div className="flex items-center gap-2">
                        <p className={`text-xl font-bold ${getDifferenceColor(calculations.difference)}`}>
                          {calculations.difference.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                        </p>
                        {getDifferenceBadge(calculations.difference)}
                      </div> */}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes et Sauvegarde */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Sauvegarde</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* <div>
                    <label className="text-sm font-medium">Observations</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes sur la clôture..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                      rows={3}
                    />
                  </div> */}
                  
                  {/* <Button
                    onClick={handleSaveClosure}
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder la Clôture'}
                  </Button> */}

                  {/* {savedClosure && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm">
                        ✅ Clôture sauvegardée le {format(new Date(savedClosure.created_at), 'dd/MM/yyyy à HH:mm')}
                      </p>
                    </div>
                  )} */}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
}