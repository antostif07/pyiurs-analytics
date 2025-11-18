import { FileText, Receipt, TrendingUp, CreditCard, Building2, MessageCircle, Wallet, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client";
import { format } from "date-fns";
import { Expense } from "@/app/types/cloture";
import { ChargeRow } from "./charge-row";
import { POSOrder } from "@/app/types/pos";
import { useEffect, useState } from "react";
import { ClotureDataView, NegativeSaleJustification } from "@/lib/cloture-service";
import { Button } from "../ui/button";
import { NegativeSaleJustificationModal } from "./negative-sale-justification-modal";

interface DetailsAndAccountingProps {
    initialData: CloturePageDataType;
    onJustificationsUpdate?: (justifications: NegativeSaleJustification[]) => void;
    isReadOnly?: boolean;
    currentClosure: ClotureDataView | null;
}

interface PaymentMethodGroup {
    name: string;
    total: number;
    count: number;
    sales: POSOrder[];
    icon: React.ReactNode;
    color: string;
}

interface ExpenseByCash {
    caissePrincipale: Expense[];
    caisseEpargne: Expense[];
    totalPrincipal: number;
    totalEpargne: number;
}

export default function DetailsAndAccounting({initialData, onJustificationsUpdate}: DetailsAndAccountingProps) {
    const [selectedSale, setSelectedSale] = useState<POSOrder | null>(null)
    const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false)
    const [justifications, setJustifications] = useState<NegativeSaleJustification[]>([])

    // Notifier le parent quand les justifications changent
    useEffect(() => {
        if (onJustificationsUpdate) {
            onJustificationsUpdate(justifications)
        }
    }, [justifications, onJustificationsUpdate])

    // Ouvrir la modal de justification
    const handleOpenJustification = (sale: POSOrder) => {
        setSelectedSale(sale)
        setIsJustificationModalOpen(true)
    }

    const handleSaveJustification = async (justificationText: string) => {
        if (!selectedSale) return

        const managerId = 1
        const managerName = "Manager Name"

        const newJustification: Omit<NegativeSaleJustification, 'id'> = {
            cash_closure_id: '',
            sale_id: selectedSale.id,
            sale_reference: `Commande #${selectedSale.id}`,
            sale_amount: selectedSale.amount_total || 0,
            justification_text: justificationText,
            manager_id: managerId,
            manager_name: managerName,
            justification_date: new Date()
        }

        const existingIndex = justifications.findIndex(j => j.sale_id === selectedSale.id)
        
        let updatedJustifications: NegativeSaleJustification[]
        
        if (existingIndex >= 0) {
            updatedJustifications = justifications.map((j, index) => 
                index === existingIndex 
                    ? { ...j, justification_text: justificationText }
                    : j
            )
        } else {
            updatedJustifications = [...justifications, { 
                ...newJustification, 
                id: Date.now().toString()
            }]
        }

        setJustifications(updatedJustifications)
        setIsJustificationModalOpen(false)
        setSelectedSale(null)
    }

    const getSaleJustification = (saleId: number) => {
        return justifications.find(j => j.sale_id === saleId)
    }
    
    // Grouper les ventes par méthode de paiement
    const paymentMethodGroups = initialData.sales.reduce((acc: {[key: string]: PaymentMethodGroup}, sale) => {
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

    // Séparer les dépenses par type de caisse
    const expensesByCash: ExpenseByCash = initialData.expenses.reduce((acc, expense) => {
        console.log(expense);
        
        const isEpargne = expense.journal_id && typeof expense.journal_id === 'object' 
            ? expense.journal_id[1].toLowerCase().includes('épargne') || expense.journal_id[1].toLowerCase().includes('epargne')
            : false;

        if (isEpargne) {
            acc.caisseEpargne.push(...expense.expenses);
            acc.totalEpargne += expense.total_amount || 0;
        } else {
            acc.caissePrincipale.push(...expense.expenses);
            acc.totalPrincipal += expense.total_amount || 0;
        }
        
        return acc;
    }, {
        caissePrincipale: [],
        caisseEpargne: [],
        totalPrincipal: 0,
        totalEpargne: 0
    } as ExpenseByCash);

    // Grouper les dépenses par catégorie pour chaque caisse
    const groupExpensesByCategory = (expenses: Expense[]) => {
        return Object.entries(
            expenses.reduce((acc: {[key: string]: {
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
        );
    };

    const caissePrincipaleCategories = groupExpensesByCategory(expensesByCash.caissePrincipale);
    const caisseEpargneCategories = groupExpensesByCategory(expensesByCash.caisseEpargne);

    return (
        <div className="container mx-auto px-2 sm:px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Ventes groupées par méthode de paiement */}
                <Card className="text-sm flex flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Receipt className="w-4 h-4" />
                            Ventes du Jour
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        {initialData.sales.length > 0 ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="grid grid-cols-2 gap-3 px-4 py-2 bg-slate-50 border-b text-xs font-medium flex-shrink-0">
                                    <div>Méthode de Paiement</div>
                                    <div className="text-right">Montant</div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {paymentGroupsArray.map((group) => (
                                        <div key={group.name} className="border-b last:border-b-0">
                                            <div className={`grid grid-cols-2 gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                                                group.total <= 0 
                                                    ? 'bg-red-50 hover:bg-red-100 border-l-2 border-l-red-500' 
                                                    : 'hover:bg-blue-50'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded ${
                                                        group.total <= 0 
                                                            ? 'bg-red-100 text-red-600' 
                                                            : group.color.replace('text-', 'bg-') + ' bg-opacity-10'
                                                    }`}>
                                                        {group.icon}
                                                    </div>
                                                    <div>
                                                        <div className={`font-semibold ${
                                                            group.total <= 0 ? 'text-red-900' : 'text-gray-900'
                                                        }`}>
                                                            {group.name}
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0 h-4">
                                                                {group.count} vente{group.count > 1 ? 's' : ''}
                                                            </Badge>
                                                            {group.total <= 0 && (
                                                                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4">
                                                                    Négatif
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${
                                                        group.total <= 0 ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                        {group.total.toLocaleString('fr-FR')} $
                                                    </div>
                                                    <div className={`text-xs mt-0.5 ${
                                                        group.total <= 0 ? 'text-red-500' : 'text-gray-500'
                                                    }`}>
                                                        Moy: {(group.total / group.count).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`border-t ${
                                                group.total <= 0 ? 'bg-red-25' : 'bg-gray-25'
                                            }`}>
                                                <div className="px-4 py-2">
                                                    <div className="mb-1">
                                                        <h4 className={`font-semibold text-xs mb-1 ${
                                                            group.total <= 0 ? 'text-red-700' : 'text-gray-700'
                                                        }`}>
                                                            Détails des ventes {group.name}
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {group.sales.map((sale) => {
                                                            const isNegativeSale = (sale.amount_total || 0) <= 0;
                                                            const saleJustification = getSaleJustification(sale.id);

                                                            return (
                                                                <div 
                                                                    key={sale.id} 
                                                                    className={`flex justify-between items-center p-2 rounded border transition-shadow ${
                                                                        isNegativeSale 
                                                                            ? 'bg-red-50 border-red-200 hover:shadow-red-sm' 
                                                                            : 'bg-white hover:shadow-sm'
                                                                    }`}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                                                isNegativeSale ? 'bg-red-500' : 'bg-green-500'
                                                                            }`}></div>
                                                                            <p className={`font-medium text-xs truncate ${
                                                                                isNegativeSale ? 'text-red-900' : 'text-gray-900'
                                                                            }`}>
                                                                                Cmd #{sale.id}
                                                                                {isNegativeSale && ' (Négatif)'}
                                                                            </p>
                                                                            {saleJustification && (
                                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0 h-4">
                                                                                    ✅
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-xs ml-2.5 text-gray-500">
                                                                            <span className={isNegativeSale ? 'text-red-600' : 'text-gray-500'}>
                                                                                {format(new Date(sale.create_date), 'dd/MM HH:mm')}
                                                                            </span>
                                                                        </div>
                                                                        {saleJustification && (
                                                                            <div className="mt-1 ml-2.5 p-1.5 bg-green-50 border border-green-200 rounded text-xs">
                                                                                <p className="text-green-800 font-medium text-xs">Justification:</p>
                                                                                <p className="text-green-700 mt-0.5 text-xs">{saleJustification.justification_text}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0 ml-2">
                                                                        <p className={`font-bold text-xs ${
                                                                            isNegativeSale ? 'text-red-600' : 'text-green-600'
                                                                        }`}>
                                                                            {(sale.amount_total || 0).toLocaleString('fr-FR')} $
                                                                        </p>
                                                                        {isNegativeSale && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="text-xs h-6 border-red-300 text-red-700 hover:bg-red-50 px-2 mt-0.5"
                                                                                onClick={() => handleOpenJustification(sale)}
                                                                            >
                                                                                <MessageCircle className="w-3 h-3 mr-0.5" />
                                                                                {saleJustification ? 'Modif' : 'Justif'}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={`grid grid-cols-2 gap-3 px-4 py-3 border-t font-bold text-sm flex-shrink-0 ${
                                    initialData.dailySalesTotal <= 0 
                                        ? 'bg-red-100 border-red-200' 
                                        : 'bg-slate-100'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className={initialData.dailySalesTotal <= 0 ? 'text-red-900' : ''}>
                                            Total Général
                                        </span>
                                        <Badge variant={initialData.dailySalesTotal <= 0 ? "destructive" : "secondary"} className="text-xs px-1.5 py-0 h-5">
                                            {initialData.sales.length} vente{initialData.sales.length > 1 ? 's' : ''}
                                        </Badge>
                                        {initialData.dailySalesTotal <= 0 && (
                                            <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                                Total négatif
                                            </Badge>
                                        )}
                                    </div>
                                    <div className={`text-right ${
                                        initialData.dailySalesTotal <= 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                        {initialData.dailySalesTotal.toLocaleString('fr-FR')} $
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm flex-1 flex flex-col items-center justify-center">
                                <Receipt className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                <p>Aucune vente enregistrée</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dépenses Groupées par Caisse */}
                <Card className="text-sm flex flex-col">
                    <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="w-4 h-4" />
                            Dépenses du Jour
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        {initialData.expenses.length > 0 ? (
                            <div className="flex-1 flex flex-col min-h-0 space-y-4">
                                {/* Caisse Principale */}
                                <div className="border rounded-lg flex-1 flex flex-col min-h-0">
                                    <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-blue-50 border-b flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                                                <Wallet className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    Caisse Principale
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0 h-4">
                                                        {expensesByCash.caissePrincipale.length} dépense{expensesByCash.caissePrincipale.length > 1 ? 's' : ''}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-600">
                                                {expensesByCash.totalPrincipal.toLocaleString('fr-FR')} $
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-0">
                                        {caissePrincipaleCategories.length > 0 ? (
                                            caissePrincipaleCategories.map(([chargeId, chargeData]) => (
                                                <ChargeRow 
                                                    key={chargeId}
                                                    chargeData={chargeData}
                                                    chargeId={chargeId}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-gray-500 text-xs flex-1 flex items-center justify-center">
                                                Aucune dépense dans la caisse principale
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Caisse Épargne */}
                                <div className="border rounded-lg flex-1 flex flex-col min-h-0">
                                    <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-green-50 border-b flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-green-100 text-green-600">
                                                <PiggyBank className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    Caisse Épargne
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0 h-4">
                                                        {expensesByCash.caisseEpargne.length} dépense{expensesByCash.caisseEpargne.length > 1 ? 's' : ''}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-600">
                                                {expensesByCash.totalEpargne.toLocaleString('fr-FR')} $
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-0">
                                        {caisseEpargneCategories.length > 0 ? (
                                            caisseEpargneCategories.map(([chargeId, chargeData]) => (
                                                <ChargeRow 
                                                    key={chargeId}
                                                    chargeData={chargeData}
                                                    chargeId={chargeId}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-gray-500 text-xs flex-1 flex items-center justify-center">
                                                Aucune dépense dans la caisse épargne
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Total général */}
                                <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-slate-100 border-t font-bold text-sm rounded flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span>Total Général</span>
                                        <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
                                            {initialData.expenses.length} dépense{initialData.expenses.length > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="text-right text-red-600">
                                        {initialData.expensesTotal.toLocaleString('fr-FR')} $
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm flex-1 flex flex-col items-center justify-center">
                                <FileText className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                <p>Aucune dépense enregistrée</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {
                selectedSale && <NegativeSaleJustificationModal
                isOpen={isJustificationModalOpen}
                onClose={() => setIsJustificationModalOpen(false)}
                onSave={handleSaveJustification}
                sale={selectedSale}
                existingJustification={selectedSale ? getSaleJustification(selectedSale.id)?.justification_text : undefined}
            />
            }
        </div>
    );
}