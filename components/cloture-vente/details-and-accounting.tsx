import { FileText, Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client";
import { format } from "date-fns";
import { Expense } from "@/app/types/cloture";
import { ChargeRow } from "./charge-row";

interface DetailsAndAccountingProps {
    initialData: CloturePageDataType;
}

export default function DetailsAndAccounting({initialData}: DetailsAndAccountingProps) {
  return (
    <div className="container mx-auto px-4">
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
                                {/* {sale.payments ? sale.payments[0].payment_method_id[1] : 'Espèces'} */}
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
        </div>
      </div>
  );
}