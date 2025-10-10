import { Customer } from "@/app/types/partner";
import { POSOrder } from "@/app/types/pos";
import { getMonthDateRange, getWeekDateRange, getWeekNumber } from "@/app/utils/date-utils";
import { Loader } from "@/components/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

interface Client extends Customer {
    cat: string;
    totalCA: number;
    totalOrders: number;
}

interface WeeklyStats {
    semaine: string;
    partGlobal: string;
    revPartClient: string;
    chrgBase: string;
    arpu: string;
    partAcq: string;
    revAcq: string;
    parcRec: string;
    revRec: string;
}

async function getPosOrders(startDate: string, endDate: string) {
    const domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,partner_id,amount_paid,amount_total,create_date&domain=${domain}`,
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

async function getPartnersInfo(partnerIds: number[]) {
    if (partnerIds.length === 0) {
        return { records: [] };
    }

    const domain = `[["id", "in", [${partnerIds.join(',')}]]]`;
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/res.partner?fields=id,name,email,phone,create_date&domain=${domain}`,
        { 
            next: { 
                revalidate: 300 // 5 minutes
            } 
        }
    );
    
    if (!res.ok) {
        throw new Error("Erreur API Odoo - Partenaires");
    }

    return res.json();
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

    // Grouper les commandes par semaine
    const ordersByWeek = new Map<string, POSOrder[]>();
    
    posOrders.forEach(order => {
        if (!order.create_date) return;
        
        const weekNumber = getWeekNumber(order.create_date);
        const weekKey = `W${weekNumber}`;
        
        if (!ordersByWeek.has(weekKey)) {
            ordersByWeek.set(weekKey, []);
        }
        ordersByWeek.get(weekKey)!.push(order);
    });
    
    // Calculer les statistiques pour chaque semaine
    const weeklyStats: WeeklyStats[] = [];

    for (const [weekKey, weekOrders] of ordersByWeek) {
        // Récupérer les partenaires uniques pour cette semaine
        const weekPartnerIds = [...new Set(
            weekOrders
                .filter(order => order.partner_id && order.partner_id[0])
                .map(order => order.partner_id![0])
        )];

        // Filtrer les partenaires pour cette semaine
        const weekPartners = partners.filter((partner: Customer) => 
            weekPartnerIds.includes(partner.id)
        );

        // Calculer les dates de la semaine pour la classification
        const firstOrderDate = weekOrders[0]?.create_date;
        if (!firstOrderDate) continue;

        const weekYear = new Date(firstOrderDate).getFullYear();
        const weekDateRange = getWeekDateRange(weekYear.toString(), weekKey.replace('W', ''));
        
        const startDateObj = new Date(weekDateRange.firstDay);
        const startWeekNumber = getWeekNumber(weekDateRange.firstDay); // Numéro de semaine du début
        const startYear = startDateObj.getFullYear();

        // Classifier les clients pour cette semaine
        const weekClients = weekPartners.map((partner: Customer) => {
            const partnerCreateDate = new Date(partner.create_date);
            const partnerWeekNumber = getWeekNumber(partner.create_date);
            const partnerYear = partnerCreateDate.getFullYear();

            // CORRECTION : Vérifier si créé dans la même semaine et même année
            const isAcquisition = partnerWeekNumber === startWeekNumber && partnerYear === startYear;

            const clientOrders = weekOrders.filter(order => 
                order.partner_id && order.partner_id[0] === partner.id
            );
            const totalCA = clientOrders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
            const totalOrders = clientOrders.length;

            return {
                id: partner.id,
                name: partner.name,
                cat: isAcquisition ? 'acquisition' : 'recurrent',
                totalCA,
                totalOrders,
                create_date: partner.create_date
            } as Client;
        });

        const acquisitions = weekClients.filter((client: Client) => client.cat === 'acquisition');
        const recurrents = weekClients.filter((client: Client) => client.cat === 'recurrent');
        
        const totalCA = weekClients.reduce((sum: number, client: Client) => sum + client.totalCA, 0);
        const caAcquisitions = acquisitions.reduce((sum: number, client: Client) => sum + client.totalCA, 0);
        const caRecurrents = recurrents.reduce((sum: number, client: Client) => sum + client.totalCA, 0);

        const stats = {
            totalClients: weekClients.length,
            acquisitions: acquisitions.length,
            recurrents: recurrents.length,
            caAcquisitions,
            caRecurrents,
            caTotal: totalCA,
            partAcq: weekClients.length > 0 ? (acquisitions.length / weekClients.length) * 100 : 0,
            partRec: weekClients.length > 0 ? (recurrents.length / weekClients.length) * 100 : 0,
            revAcq: totalCA > 0 ? (caAcquisitions / totalCA) * 100 : 0,
            revRec: totalCA > 0 ? (caRecurrents / totalCA) * 100 : 0
        };

        // Formater les données comme dans le mock
        weeklyStats.push({
            semaine: weekKey,
            partGlobal: weekClients.length.toString(),
            revPartClient: `$${totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`,
            chrgBase: `${weekClients.length}`,
            arpu: `$${weekClients.length > 0 ? (totalCA / weekClients.length).toFixed(0) : 0}`,
            partAcq: `${acquisitions.length} (${stats.partAcq.toFixed(2)}%)`,
            revAcq: `$${caAcquisitions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${stats.revAcq.toFixed(2)}%)`,
            parcRec: `${recurrents.length} (${stats.partRec.toFixed(2)}%)`,
            revRec: `$${caRecurrents.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${stats.revRec.toFixed(2)}%)`,
        });

        // Log pour débogage
        console.log(`Semaine ${weekKey}: ${acquisitions.length} acquisitions sur ${weekClients.length} clients total`);
    }

    // Trier par semaine (W1, W2, etc.)
    return weeklyStats.sort((a, b) => {
        const weekA = parseInt(a.semaine.replace('W', ''));
        const weekB = parseInt(b.semaine.replace('W', ''));
        return weekA - weekB;
    });
}

export default async function WeeklyTabs({startDate, endDate}: {startDate?: string, endDate?: string}) {
    let start_date = startDate;
    let end_date = endDate;
    const currentDate = new Date()

    if(!start_date) {
        start_date = getMonthDateRange((currentDate.getMonth() + 1).toString(), currentDate.getFullYear().toString()).firstDay
    }
    if(!end_date) {
        end_date = getMonthDateRange((currentDate.getMonth() + 1).toString(), currentDate.getFullYear().toString()).lastDay
    }

    const data = await getData(start_date, end_date);

    return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loader />}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 font-semibold">Semaine</th>
                            {/* <th className="text-left py-3 px-4 font-semibold">Parc Global</th> */}
                            <th className="text-left py-3 px-4 font-semibold">Rev. Global</th>
                            <th className="text-left py-3 px-4 font-semibold">Chrg. Base (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">ARPU</th>
                            <th className="text-left py-3 px-4 font-semibold">Parc Acq (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Rev Acq (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Parc Rec. (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Rev Rec. (%)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((week) => (
                            <tr key={week.semaine} className="border-b border-gray-100 dark:border-slate-700">
                            <td className="py-3 px-4 font-medium">{week.semaine}</td>
                            {/* <td className="py-3 px-4">{week.partGlobal}</td> */}
                            <td className="py-3 px-4">{week.revPartClient}</td>
                            <td className="py-3 px-4">{week.chrgBase}</td>
                            <td className="py-3 px-4">{week.arpu}</td>
                            <td className="py-3 px-4">{week.partAcq}</td>
                            <td className="py-3 px-4">{week.revAcq}</td>
                            <td className="py-3 px-4">{week.parcRec}</td>
                            <td className="py-3 px-4">{week.revRec}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Suspense>
          </CardContent>
        </Card>
    )
}