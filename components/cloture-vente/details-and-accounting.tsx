import { FileText, Receipt, TrendingUp, CreditCard, Building2, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client";
import { format } from "date-fns";
import { Expense } from "@/app/types/cloture";
import { ChargeRow } from "./charge-row";
import { POSOrder } from "@/app/types/pos";
import { useEffect, useState } from "react";
import { NegativeSaleJustification } from "@/lib/cloture-service";
import { Button } from "../ui/button";
import { NegativeSaleJustificationModal } from "./negative-sale-justification-modal";

interface DetailsAndAccountingProps {
    initialData: CloturePageDataType;
    onJustificationsUpdate?: (justifications: NegativeSaleJustification[]) => void;
    isReadOnly?: boolean;
}

interface PaymentMethodGroup {
    name: string;
    total: number;
    count: number;
    sales: POSOrder[];
    icon: React.ReactNode;
    color: string;
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

        // Ici vous devrez récupérer l'ID du manager depuis votre système d'authentification
        const managerId = 1 // À remplacer par l'ID réel du manager
        const managerName = "Manager Name" // À remplacer par le nom réel

        const newJustification: Omit<NegativeSaleJustification, 'id'> = {
            cash_closure_id: '', // Sera rempli lors de la sauvegarde de la clôture
            sale_id: selectedSale.id,
            sale_reference: `Commande #${selectedSale.id}`,
            sale_amount: selectedSale.amount_total || 0,
            justification_text: justificationText,
            manager_id: managerId,
            manager_name: managerName,
            justification_date: new Date()
        }

        // Vérifier si une justification existe déjà pour cette vente
        const existingIndex = justifications.findIndex(j => j.sale_id === selectedSale.id)
        
        let updatedJustifications: NegativeSaleJustification[]
        
        if (existingIndex >= 0) {
            // Mettre à jour la justification existante
            updatedJustifications = justifications.map((j, index) => 
                index === existingIndex 
                    ? { ...j, justification_text: justificationText }
                    : j
            )
        } else {
            // Ajouter une nouvelle justification
            updatedJustifications = [...justifications, { 
                ...newJustification, 
                id: Date.now().toString() // ID temporaire pour l'affichage
            }]
        }

        setJustifications(updatedJustifications)
        setIsJustificationModalOpen(false)
        setSelectedSale(null)
    }

    // Vérifier si une vente a déjà une justification
    const getSaleJustification = (saleId: number) => {
        return justifications.find(j => j.sale_id === saleId)
    }
    
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
                                {paymentGroupsArray.map((group) => (
                                    <div key={group.name} className="border-b last:border-b-0">
                                        {/* Ligne principale du groupe */}
                                        <div className={`grid grid-cols-2 gap-4 px-6 py-4 cursor-pointer transition-colors group ${
                                            group.total <= 0 
                                                ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' 
                                                : 'hover:bg-blue-50'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${
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
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            {group.count} vente{group.count > 1 ? 's' : ''}
                                                        </Badge>
                                                        {group.total <= 0 && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                Montant négatif
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold text-lg ${
                                                    group.total <= 0 ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                    {group.total.toLocaleString('fr-FR')} $
                                                </div>
                                                <div className={`text-xs mt-1 ${
                                                    group.total <= 0 ? 'text-red-500' : 'text-gray-500'
                                                }`}>
                                                    Moyenne: {(group.total / group.count).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                                                </div>
                                            </div>
                                        </div>

                                        {/* Détails des ventes pour cette méthode de paiement */}
                                        <div className={`border-t ${
                                            group.total <= 0 ? 'bg-red-25' : 'bg-gray-25'
                                        }`}>
                                            <div className="px-6 py-3">
                                                <div className="mb-2">
                                                    <h4 className={`font-semibold text-sm mb-2 ${
                                                        group.total <= 0 ? 'text-red-700' : 'text-gray-700'
                                                    }`}>
                                                        Détails des ventes {group.name}
                                                    </h4>
                                                </div>
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {group.sales.map((sale) => {
                                                        const isNegativeSale = (sale.amount_total || 0) <= 0;
                                                        const saleJustification = getSaleJustification(sale.id);

                                                        return (
                                                            <div 
                                                                key={sale.id} 
                                                                className={`flex justify-between items-center p-3 rounded-lg border transition-shadow ${
                                                                    isNegativeSale 
                                                                        ? 'bg-red-50 border-red-200 hover:shadow-red-sm' 
                                                                        : 'bg-white hover:shadow-sm'
                                                                }`}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className={`w-2 h-2 rounded-full ${
                                                                            isNegativeSale ? 'bg-red-500' : 'bg-green-500'
                                                                        }`}></div>
                                                                        <p className={`font-medium text-sm ${
                                                                            isNegativeSale ? 'text-red-900' : 'text-gray-900'
                                                                        }`}>
                                                                            Commande #{sale.id}
                                                                            {isNegativeSale && ' (Montant négatif)'}
                                                                        </p>
                                                                        {saleJustification && (
                                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                                                ✅ Justifiée
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs ml-2">
                                                                        <span className={isNegativeSale ? 'text-red-600' : 'text-gray-500'}>
                                                                            {format(new Date(sale.create_date), 'dd/MM/yyyy HH:mm')} • 
                                                                            {sale.config_id && typeof sale.config_id === 'object' ? sale.config_id[1] : 'Boutique'}
                                                                        </span>
                                                                    </div>
                                                                    {saleJustification && (
                                                                        <div className="mt-2 ml-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                                                            <p className="text-green-800 font-medium">Justification:</p>
                                                                            <p className="text-green-700 mt-1">{saleJustification.justification_text}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className={`font-bold text-sm ${
                                                                        isNegativeSale ? 'text-red-600' : 'text-green-600'
                                                                    }`}>
                                                                        {(sale.amount_total || 0).toLocaleString('fr-FR')} $
                                                                    </p>
                                                                    {isNegativeSale && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-50"
                                                                            onClick={() => handleOpenJustification(sale)}
                                                                        >
                                                                            <MessageCircle className="w-3 h-3 mr-1" />
                                                                            {saleJustification ? 'Modifier' : 'Justifier'}
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

                                {/* Total général */}
                                <div className={`grid grid-cols-2 gap-4 px-6 py-4 border-t font-bold ${
                                    initialData.dailySalesTotal <= 0 
                                        ? 'bg-red-100 border-red-200' 
                                        : 'bg-slate-100'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className={initialData.dailySalesTotal <= 0 ? 'text-red-900' : ''}>
                                            Total Général
                                        </span>
                                        <Badge variant={initialData.dailySalesTotal <= 0 ? "destructive" : "secondary"}>
                                            {initialData.sales.length} vente{initialData.sales.length > 1 ? 's' : ''}
                                        </Badge>
                                        {initialData.dailySalesTotal <= 0 && (
                                            <Badge variant="destructive" className="text-xs">
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