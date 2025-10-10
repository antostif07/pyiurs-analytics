import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMonthDateRange, getWeekNumber } from "@/app/utils/date-utils";
import { Customer } from "@/app/types/partner";

interface POSOrder {
    id: number;
    partner_id: [number, string] | null;
    amount_paid: number;
    amount_total: number;
    create_date: string;
    config_id: [number, string]; // [id, name]
}

interface POSConfig {
    id: number;
    name: string;
}

interface BoutiqueData {
    name: string;
    [weekKey: string]: number | string; // W36: 10, W37: 5, etc.
}

async function getPartnersInfo(partnerIds: number[]): Promise<{ records: Customer[] }> {
    if (partnerIds.length === 0) {
        return { records: [] };
    }

    // Vérifier le cache d'abord
    const cachedPartners: Customer[] = [];
    const missingIds: number[] = [];

    partnerIds.forEach(id => {
        if (partnerCache.has(id)) {
            cachedPartners.push(partnerCache.get(id)!);
        } else {
            missingIds.push(id);
        }
    });

    if (missingIds.length === 0) {
        return { records: cachedPartners };
    }

    // Récupérer les partenaires manquants par batch
    const BATCH_SIZE = 100;
    const batches: number[][] = [];
    
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
        batches.push(missingIds.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch) => {
        const domain = `[["id", "in", [${batch.join(',')}]]]`;
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/res.partner?fields=id,name,email,phone,create_date&domain=${domain}`,
            { 
                next: { 
                    revalidate: 300
                } 
            }
        );
        
        if (!res.ok) {
            console.warn(`Batch échoué: ${res.status}`);
            return [];
        }

        const data = await res.json();
        const partners = data.records || [];
        
        // Mettre en cache
        partners.forEach((partner: Customer) => {
            partnerCache.set(partner.id, partner);
        });
        
        return partners;
    });

    const batchResults = await Promise.all(batchPromises);
    const fetchedPartners = batchResults.flat();

    // Combiner cache et nouveaux partenaires
    const allPartners = [...cachedPartners, ...fetchedPartners];
    
    return { records: allPartners };
}

async function getPosOrders(startDate: string, endDate: string) {
    const domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,partner_id,amount_paid,amount_total,create_date,config_id&domain=${domain}`,
        { 
            next: { 
                revalidate: 300 // 5 minutes
            } 
        }
    );
    if (!res.ok) {
        throw new Error("Erreur API Odoo - Ventes POS");
    }
    return res.json();
}

async function getPosConfigs(configIds: number[]) {
    if (configIds.length === 0) {
        return { records: [] };
    }

    const BATCH_SIZE = 100;
    const batches: number[][] = [];
    
    for (let i = 0; i < configIds.length; i += BATCH_SIZE) {
        batches.push(configIds.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch) => {
        const domain = `[["id", "in", [${batch.join(',')}]]]`;
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name&domain=${domain}`,
            { 
                next: { 
                    revalidate: 300
                } 
            }
        );
        
        if (!res.ok) {
            console.warn(`Batch configs échoué: ${res.status}`);
            return [];
        }

        const data = await res.json();
        return data.records || [];
    });

    const batchResults = await Promise.all(batchPromises);
    const allConfigs = batchResults.flat();
    
    return { records: allConfigs };
}

// Cache pour éviter de récupérer plusieurs fois les mêmes partenaires
const partnerCache = new Map<number, Customer>();

async function getShopData(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
        return {
            boutiques: [],
            weeks: [],
            total: {}
        };
    }

    try {
        // Reset cache pour test de cohérence
        partnerCache.clear();

        // 1. Récupérer les commandes POS
        const posOrdersData = await getPosOrders(startDate, endDate);
        const posOrders = posOrdersData.records as Array<POSOrder>;

        if (!posOrders || posOrders.length === 0) {
            return {
                boutiques: [],
                weeks: [],
                total: {}
            };
        }

        // 2. RÉCUPÉRER TOUS LES PARTENAIRES UNIQUES (comme dans getData)
        const uniquePartnerIds = [...new Set(
            posOrders
                .filter(order => order.partner_id && order.partner_id[0])
                .map(order => order.partner_id![0])
        )];

        // 3. Récupérer les informations de TOUS les partenaires
        const partnersData = await getPartnersInfo(uniquePartnerIds);
        const partners = partnersData.records;
        
        // Mettre tous les partenaires dans le cache
        partners.forEach(partner => {
            partnerCache.set(partner.id, partner);
        });

        // 4. Filtrer les commandes valides (avec config_id)
        const validOrders = posOrders.filter(order => 
            order.config_id && order.config_id[0] && 
            order.partner_id && order.partner_id[0] && 
            order.create_date
        );

        // 5. Récupérer les configurations POS
        const uniqueConfigIds = [...new Set(
            validOrders.map(order => order.config_id![0])
        )];

        const configsData = await getPosConfigs(uniqueConfigIds);
        const configs = configsData.records as POSConfig[];

        // 6. Compter les acquisitions
        const boutiqueWeekData = new Map<string, Map<string, number>>();
        const allWeeks = new Set<string>();

        validOrders.forEach(order => {
            const configId = order.config_id![0];
            const partnerId = order.partner_id![0];
            const orderDate = order.create_date!;
            const weekNumber = getWeekNumber(orderDate);
            const weekKey = `W${weekNumber}`;

            const partner = partnerCache.get(partnerId);
            if (!partner || !partner.create_date) return;

            // Même logique que getData
            const partnerCreateDate = new Date(partner.create_date);
            const partnerWeekNumber = getWeekNumber(partner.create_date);
            const partnerYear = partnerCreateDate.getFullYear();
            const orderYear = new Date(orderDate).getFullYear();
            
            const isAcquisition = weekNumber === partnerWeekNumber && orderYear === partnerYear;

            if (!isAcquisition) return;
            allWeeks.add(weekKey);

            const config = configs.find(c => c.id === configId);
            const boutiqueName = config?.name || `Boutique ${configId}`;

            if (!boutiqueWeekData.has(boutiqueName)) {
                boutiqueWeekData.set(boutiqueName, new Map());
            }

            const boutiqueData = boutiqueWeekData.get(boutiqueName)!;
            const currentCount = boutiqueData.get(weekKey) || 0;
            boutiqueData.set(weekKey, currentCount + 1);
        });

        // 7. Convertir en format tableau pour l'affichage
        const weeks = Array.from(allWeeks).sort((a, b) => {
            const weekA = parseInt(a.replace('W', ''));
            const weekB = parseInt(b.replace('W', ''));
            return weekA - weekB;
        });

        const boutiques: BoutiqueData[] = [];
        const total: { [weekKey: string]: number } = {};

        // Initialiser les totaux
        weeks.forEach(week => {
            total[week] = 0;
        });

        // Construire les données des boutiques
        boutiqueWeekData.forEach((weekData, boutiqueName) => {
            const boutique: BoutiqueData = { name: boutiqueName };
            
            weeks.forEach(week => {
                const count = weekData.get(week) || 0;
                boutique[week] = count;
                total[week] = (total[week] || 0) + count;
            });

            boutiques.push(boutique);
        });

        // Trier les boutiques par nom
        boutiques.sort((a, b) => a.name.localeCompare(b.name));

        return {
            boutiques,
            weeks,
            total
        };

    } catch (error) {
        console.error('Erreur dans getShopData:', error);
        return {
            boutiques: [],
            weeks: [],
            total: {}
        };
    }
}

interface ShopByWeekProps {
    startDate?: string;
    endDate?: string;
}

export default async function ShopByWeek({ startDate, endDate }: ShopByWeekProps) {
    let start_date = startDate;
    let end_date = endDate;
    const currentDate = new Date()

    if(!start_date) {
        start_date = getMonthDateRange((currentDate.getMonth() + 1).toString(), currentDate.getFullYear().toString()).firstDay
    }
    if(!end_date) {
        end_date = getMonthDateRange((currentDate.getMonth() + 1).toString(), currentDate.getFullYear().toString()).lastDay
    }
    const shopData = await getShopData(start_date, end_date);

    // Si pas de données, afficher un message
    if (!shopData.boutiques.length || !shopData.weeks.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">Performance Acquisition Shop</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-gray-500 py-8">
                        {startDate && endDate 
                            ? "Aucune donnée disponible pour la période sélectionnée" 
                            : "Sélectionnez une période pour voir les données"
                        }
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">Performance Acquisition Shop</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 font-semibold">Boutique</th>
                                {shopData.weeks.map(week => (
                                    <th key={week} className="text-left py-3 px-4 font-semibold">
                                        {week}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shopData.boutiques.map((boutique) => (
                                <tr key={boutique.name} className="border-b border-gray-100 dark:border-slate-700">
                                    <td className="py-3 px-4 font-medium">{boutique.name}</td>
                                    {shopData.weeks.map(week => (
                                        <td key={week} className="py-3 px-4">
                                            {boutique[week] || 0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 dark:bg-slate-700/30 font-semibold">
                                <td className="py-3 px-4">Total Mols</td>
                                {shopData.weeks.map(week => (
                                    <td key={week} className="py-3 px-4">
                                        {shopData.total[week] || 0}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                {/* Résumé statistique */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-medium">Période: </span>
                        {startDate} à {endDate}
                    </div>
                    <div>
                        <span className="font-medium">Boutiques: </span>
                        {shopData.boutiques.length}
                    </div>
                    <div>
                        <span className="font-medium">Semaines: </span>
                        {shopData.weeks.length}
                    </div>
                    <div>
                        <span className="font-medium">Clients: </span>
                        {Object.values(shopData.total).reduce((sum, count) => sum + count, 0)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}