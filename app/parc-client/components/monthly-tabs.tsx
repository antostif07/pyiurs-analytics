import { Customer } from "@/app/types/partner";
import { POSOrder } from "@/app/types/pos";
import { months } from "@/app/utils/date-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getYear } from "date-fns";

interface Client extends Customer {
    cat: string;
    totalCA: number;
    totalOrders: number;
}

type PageProps = {
    endDate?: string;
}


interface MonthStats {
    month: string;
    revPartClient: string;
    chgBase: string;
    arpu: string;
    partAcq: string;
    revAcq: string;
    parcRec: string;
    revRec: string;
}

async function getPosOrders(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculer la durée totale en jours
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Ajuster la taille du batch en fonction de la durée totale
    let DAYS_PER_BATCH: number;
    if (diffDays <= 30) {
        DAYS_PER_BATCH = 7; // Petite période = petits batches
    } else if (diffDays <= 90) {
        DAYS_PER_BATCH = 15; // Période moyenne = batches moyens
    } else {
        DAYS_PER_BATCH = 30; // Longue période = gros batches
    }

    const batches: { batchStart: string; batchEnd: string }[] = [];
    let current = new Date(start);

    while (current <= end) {
        const batchStart = new Date(current);
        const batchEnd = new Date(current);
        batchEnd.setDate(batchEnd.getDate() + DAYS_PER_BATCH - 1);
        
        const actualEnd = batchEnd > end ? end : batchEnd;
        
        batches.push({
            batchStart: batchStart.toISOString().split('T')[0],
            batchEnd: actualEnd.toISOString().split('T')[0]
        });

        current = new Date(batchEnd);
        current.setDate(current.getDate() + 1);
    }

    const batchPromises = batches.map(async (batch, index) => {
        const domain = `[["create_date", ">=", "${batch.batchStart}"], ["create_date", "<=", "${batch.batchEnd}"]]`;
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,partner_id,amount_paid,amount_total,create_date&domain=${domain}`,
            { 
                next: { 
                    revalidate: 300
                } 
            }
        );
        
        if (!res.ok) {
            console.warn(`Batch ${index + 1} échoué: ${res.status} ${res.statusText}`);
            return { records: [] };
        }

        const data = await res.json();
        return data;
    });

    const batchResults = await Promise.all(batchPromises);
    const allRecords = batchResults.flatMap(result => result.records || []);

    return { records: allRecords };
}

// Cache simple en mémoire (attention en production)
const partnerCache = new Map<number, Customer>();

async function getPartnersInfo(partnerIds: number[]): Promise<{ records: Customer[] }> {
    if (partnerIds.length === 0) {
        return { records: [] };
    }

    console.log(`Récupération de ${partnerIds.length} partenaires...`);

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

    console.log(`${cachedPartners.length} partenaires depuis le cache, ${missingIds.length} à récupérer`);

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

    console.log(`${fetchedPartners.length} nouveaux partenaires récupérés`);

    // Combiner cache et nouveaux partenaires
    const allPartners = [...cachedPartners, ...fetchedPartners];
    
    return { records: allPartners };
}

async function getData(startDate: string, endDate: string) {
    const posOrdersData = await getPosOrders(startDate, endDate);
    const posOrders = posOrdersData.records as Array<POSOrder>;
    
    // Récupérer tous les partenaires uniques
    const uniquePartnerIds = [...new Set(
        posOrders
            .filter(order => order.partner_id && order.partner_id[0])
            .map(order => order.partner_id![0])
    )];

    const partnersData = await getPartnersInfo(uniquePartnerIds);
    const partners = partnersData.records;

    // Grouper les commandes par mois
    const ordersByMonth = new Map<string, { orders: POSOrder[]; year: number }>();

    posOrders.forEach(order => {
        if (!order.create_date) return;
        
        const orderDate = new Date(order.create_date);
        const monthNumber = orderDate.getMonth() + 1;
        const year = orderDate.getFullYear();
        const monthKey = `${year}-${monthNumber.toString().padStart(2, '0')}`;
        
        if (!ordersByMonth.has(monthKey)) {
            ordersByMonth.set(monthKey, { orders: [], year });
        }
        ordersByMonth.get(monthKey)!.orders.push(order);
    });

    const monthStats: MonthStats[] = [];
    const monthlyClientCounts = new Map<string, number>();

    // Premier passage : compter les clients par mois
    for (const [monthKey, monthData] of ordersByMonth) {
        const monthPartnerIds = [...new Set(
            monthData.orders
                .filter(order => order.partner_id && order.partner_id[0])
                .map(order => order.partner_id![0])
        )];
        monthlyClientCounts.set(monthKey, monthPartnerIds.length);
    }

    // Deuxième passage : calculer les statistiques détaillées
    for (const [monthKey, monthData] of ordersByMonth) {
        const monthOrders = monthData.orders;
        const [year, monthNumber] = monthKey.split('-').map(Number);

        // Récupérer les partenaires uniques pour ce mois
        const monthPartnerIds = [...new Set(
            monthOrders
                .filter(order => order.partner_id && order.partner_id[0])
                .map(order => order.partner_id![0])
        )];

        // Filtrer les partenaires pour ce mois
        const monthPartners = partners.filter((partner: Customer) => 
            monthPartnerIds.includes(partner.id)
        );

        // Classifier les clients pour ce mois
        const monthClients = monthPartners.map((partner: Customer) => {
            const partnerCreateDate = new Date(partner.create_date);
            const partnerMonth = partnerCreateDate.getMonth() + 1;
            const partnerYear = partnerCreateDate.getFullYear();

            const isAcquisition = partnerMonth === monthNumber && partnerYear === year;

            const clientOrders = monthOrders.filter(order => 
                order.partner_id && order.partner_id[0] === partner.id
            );
            const totalCA = clientOrders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
            const totalOrders = clientOrders.length;

            return {
                id: partner.id,
                name: partner.name,
                cat: isAcquisition ? 'acquisition' : 'recurrent',
                totalCA,
                totalOrders
            } as Client;
        });

        const acquisitions = monthClients.filter((client: Client) => client.cat === 'acquisition');
        const recurrents = monthClients.filter((client: Client) => client.cat === 'recurrent');
        
        // Calculer les statistiques
        const totalCA = monthClients.reduce((sum: number, client: Client) => sum + client.totalCA, 0);
        const caAcquisitions = acquisitions.reduce((sum: number, client: Client) => sum + client.totalCA, 0);
        const caRecurrents = recurrents.reduce((sum: number, client: Client) => sum + client.totalCA, 0);
        const totalClients = monthClients.length;

        // Calculer la variation de la base client
        const chgBase = totalClients;

        // Calculer ARPU
        const arpu = totalClients > 0 ? totalCA / totalClients : 0;

        // Calculer les pourcentages
        const partAcq = totalClients > 0 ? (acquisitions.length / totalClients) * 100 : 0;
        const partRec = totalClients > 0 ? (recurrents.length / totalClients) * 100 : 0;
        const revAcq = totalCA > 0 ? (caAcquisitions / totalCA) * 100 : 0;
        const revRec = totalCA > 0 ? (caRecurrents / totalCA) * 100 : 0;

        // Trouver le nom du mois
        const monthName = months.find(m => m.value === monthNumber.toString())?.name || `Mois ${monthNumber}`;

        monthStats.push({
            month: monthName,
            revPartClient: `$${totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`,
            chgBase: `${chgBase}`,
            arpu: `$${arpu.toFixed(2)}`,
            partAcq: `${acquisitions.length} (${partAcq.toFixed(2)}%)`,
            revAcq: `$${caAcquisitions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${revAcq.toFixed(2)}%)`,
            parcRec: `${recurrents.length} (${partRec.toFixed(2)}%)`,
            revRec: `$${caRecurrents.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${revRec.toFixed(2)}%)`
        });
    }

    // Trier par année et mois
    return monthStats.sort((a, b) => {
        const monthA = months.findIndex(m => m.name === a.month);
        const monthB = months.findIndex(m => m.name === b.month);
        return monthA - monthB;
    });
}

export default async function MonthlyTable({endDate}: PageProps) {
    let start_date, end_date = endDate;

    if(!end_date) {
        const date = new Date();
        start_date = `${date.getFullYear()}-01-01`;
        end_date = `${date.getFullYear()}-12-31`;
    } else {
        const year = getYear(end_date);
        start_date = `${year}-01-01`;
        end_date = `${year}-12-31`;
    }

    const data = await getData(start_date, end_date)
    
    return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold">Month</th>
                    <th className="text-left py-3 px-4 font-semibold">Rev. Global</th>
                    <th className="text-left py-3 px-4 font-semibold">Chg. Base</th>
                    <th className="text-left py-3 px-4 font-semibold">ARPU</th>
                    <th className="text-left py-3 px-4 font-semibold">Part Acq (%)</th>
                    <th className="text-left py-3 px-4 font-semibold">Rev Acq (%)</th>
                    <th className="text-left py-3 px-4 font-semibold">Part Rec (%)</th>
                    <th className="text-left py-3 px-4 font-semibold">Rev. Rec</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((month) => (
                    <tr key={month.month} className="border-b border-gray-100 dark:border-slate-700">
                      <td className="py-3 px-4 font-medium">{month.month}</td>
                      <td className="py-3 px-4">{month.revPartClient}</td>
                      <td className="py-3 px-4">{month.chgBase}</td>
                      <td className="py-3 px-4">{month.arpu}</td>
                      <td className="py-3 px-4">{month.partAcq}</td>
                      <td className="py-3 px-4">{month.revAcq}</td>
                      <td className="py-3 px-4">{month.parcRec}</td>
                      <td className="py-3 px-4">{month.revRec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    )
}