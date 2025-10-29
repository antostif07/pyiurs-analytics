import { FileText, Receipt, TrendingUp, CreditCard, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client";
import { format } from "date-fns";
import { Expense } from "@/app/types/cloture";
import { ChargeRow } from "./charge-row";
import { POSOrder } from "@/app/types/pos";

interface DetailsAndAccountingProps {
    initialData: CloturePageDataType;
}

interface PaymentMethodGroup {
    name: string;
    total: number;
    count: number;
    sales: POSOrder[];
    icon: React.ReactNode;
    color: string;
}

export default function DetailsAndAccounting({initialData}: DetailsAndAccountingProps) {
    
    // Grouper les ventes par méthode de paiement
    const paymentMethodGroups = initialData.sales.reduce((acc: {[key: string]: PaymentMethodGroup}, sale) => {
        // Déterminer la méthode de paiement principale
        let paymentMethod = 'Espèces';
        let icon = <CreditCard className="w-4 h-4" />;
        let color = 'text-green-600';

        if (sale.payments && sale.payments.length > 0) {
            const paymentName = sale.payments[0].payment_method_id[1].toLowerCase();
            
            if (paymentName.includes('banque') || paymentName.includes('bank')) {
                paymentMethod = 'Banque';
                icon = <Building2 className="w-4 h-4" />;
                color = 'text-purple-600';
            } else if (paymentName.includes('mobile') || paymentName.includes('money')) {
                paymentMethod = 'Mobile Money';
                icon = <FileText className="w-4 h-4" />;
                color = 'text-blue-600';
            } else if (paymentName.includes('online') || paymentName.includes('onl')) {
                paymentMethod = 'Online';
                icon = <TrendingUp className="w-4 h-4" />;
                color = 'text-orange-600';
            }
        }

        if (!acc[paymentMethod]) {
            acc[paymentMethod] = {
                name: paymentMethod,
                total: 0,
                count: 0,
                sales: [],
                icon,
                color
            };
        }

        acc[paymentMethod].total += sale.amount_total || 0;
        acc[paymentMethod].count += 1;
        acc[paymentMethod].sales.push(sale);

        return acc;
    }, {});

    const paymentGroupsArray = Object.values(paymentMethodGroups);

    return (
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ventes groupées par méthode de paiement */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5" />
                            Ventes du Jour
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {initialData.sales.length > 0 ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4 px-6 py-3 bg-slate-50 border-b font-semibold text-sm">
                                    <div>Méthode de Paiement</div>
                                    <div className="text-right">Montant</div>
                                </div>

                                {/* Groupes par méthode de paiement */}
                                {paymentGroupsArray.map((group, index) => (
                                    <div key={group.name} className="border-b last:border-b-0">
                                        {/* Ligne principale du groupe */}
                                        <div className="grid grid-cols-2 gap-4 px-6 py-4 cursor-pointer hover:bg-blue-50 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${group.color.replace('text-', 'bg-')} bg-opacity-10`}>
                                                    {group.icon}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{group.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            {group.count} vente{group.count > 1 ? 's' : ''}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg text-green-600">
                                                    {group.total.toLocaleString('fr-FR')} $
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Moyenne: {(group.total / group.count).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                                                </div>
                                            </div>
                                        </div>

                                        {/* Détails des ventes pour cette méthode de paiement */}
                                        <div className="bg-gray-25 border-t">
                                            <div className="px-6 py-3">
                                                <div className="mb-2">
                                                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Détails des ventes {group.name}</h4>
                                                </div>
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {group.sales.map((sale) => (
                                                        <div 
                                                            key={sale.id} 
                                                            className="flex justify-between items-center p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                    <p className="font-medium text-sm text-gray-900">
                                                                        Commande #{sale.id}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 ml-2">
                                                                    <span>
                                                                        {format(new Date(sale.create_date), 'dd/MM/yyyy HH:mm')} • 
                                                                        {sale.config_id && typeof sale.config_id === 'object' ? sale.config_id[1] : 'Boutique'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-green-600 text-sm">
                                                                    {(sale.amount_total || 0).toLocaleString('fr-FR')} $
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Total général */}
                                <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-slate-100 border-t font-bold">
                                    <div className="flex items-center gap-2">
                                        <span>Total Général</span>
                                        <Badge variant="secondary">
                                            {initialData.sales.length} vente{initialData.sales.length > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="text-right text-green-600">
                                        {initialData.dailySalesTotal.toLocaleString('fr-FR')} $
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Aucune vente enregistrée pour cette journée</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dépenses Groupées par Charge */}
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