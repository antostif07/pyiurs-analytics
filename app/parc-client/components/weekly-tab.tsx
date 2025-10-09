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
    partRec: string;
    partGlobal2: string;
    revPartClient2: string;
    chrgBase2: string;
    arpu2: string;
    partAcq2: string;
    revAcq2: string;
    partRec2: string;
}

const mockReportData = {
  weekly: [
    {
      semaine: "W36",
      partGlobal: "19840",
      revPartClient: "$5 960",
      chrgBase: "75 (00.38%)",
      arpu: "$79",
      partAcq: "24 (32.00%)",
      revAcq: "$2226 (37.34%)",
      partRec: "$1 (68%)",
      partGlobal2: "19849",
      revPartClient2: "$2 165",
      chrgBase2: "28 (00.14%)",
      arpu2: "$77",
      partAcq2: "6 (21.43%)",
      revAcq2: "$863 (39.86%)",
      partRec2: "22 (79%)"
    },
    {
      semaine: "W37",
      partGlobal: "19845",
      revPartClient: "$6 120",
      chrgBase: "80 (00.40%)",
      arpu: "$82",
      partAcq: "28 (35.00%)",
      revAcq: "$2450 (40.00%)",
      partRec: "$1 (65%)",
      partGlobal2: "19852",
      revPartClient2: "$2 280",
      chrgBase2: "32 (00.16%)",
      arpu2: "$79",
      partAcq2: "8 (25.00%)",
      revAcq2: "$912 (40.00%)",
      partRec2: "24 (75%)"
    }
  ],
  monthly: [
    {
      month: "Janvier",
      revPartClient: "$35 433",
      chgBase: "348 (2%)",
      arpu: "$101,82",
      partAcq: "107 (30.75%)",
      revAcq: "$12351 (34.86%)",
      partRec: "241 (69%)",
      revRec: "$23 082 (65%)"
    },
    {
      month: "Février",
      revPartClient: "$36 780",
      chgBase: "378 (2%)",
      arpu: "$97,30",
      partAcq: "132 (34.92%)",
      revAcq: "$14309 (38.90%)",
      partRec: "246 (65%)",
      revRec: "$22 471 (61%)"
    },
    {
      month: "Mars",
      revPartClient: "$103 133",
      chgBase: "1226 (7%)",
      arpu: "$84,12",
      partAcq: "659 (53.75%)",
      revAcq: "$55469 (53.78%)",
      partRec: "567 (46%)",
      revRec: "$47 664 (46%)"
    },
    {
      month: "Avril",
      revPartClient: "$35 742",
      chgBase: "435 (2%)",
      arpu: "$82,16",
      partAcq: "151 (34.71%)",
      revAcq: "$15965 (44.67%)",
      partRec: "284 (65%)",
      revRec: "$19 777 (55%)"
    },
    {
      month: "Mai",
      revPartClient: "$33 225",
      chgBase: "384 (2%)",
      arpu: "$86,52",
      partAcq: "117 (30.47%)",
      revAcq: "$11920 (35.88%)",
      partRec: "267 (70%)",
      revRec: "$21 305 (64%)"
    },
    {
      month: "Juin",
      revPartClient: "$29 151",
      chgBase: "371 (2%)",
      arpu: "$78,57",
      partAcq: "163 (43.94%)",
      revAcq: "$11621 (39.86%)",
      partRec: "208 (56%)",
      revRec: "$17 530 (60%)"
    }
  ],
  acquisition: {
    boutiques: [
      { name: "P24", w36: 10, w37: 2 },
      { name: "PKTM", w36: 1, w37: 1 },
      { name: "PMTO", w36: 7, w37: 1 },
      { name: "PONL", w36: 3, w37: 2 },
      { name: "ZARINA", w36: 3, w37: null }
    ],
    total: { w36: 24, w37: 6 }
  },
  telephone: [
    { nom: "Madame Ami", totalAchat: "$120", total: "$2 477" },
    { nom: "BIBICHE IVOLO", totalAchat: "", total: "$2 439" },
    { nom: "M r Abdoi brazza", totalAchat: "$275", total: "" },
    { nom: "Madame Gabriella", totalAchat: "$3 471", total: "" },
    { nom: "Madame Acha Rachidi", totalAchat: "$479", total: "" },
    { nom: "Madame Chistralia", totalAchat: "$325", total: "" }
  ],
  totalGeneral: "$3 262 916"
};

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
        
        const orderDate = new Date(order.create_date);
        const year = orderDate.getFullYear();
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
        const startMonth = startDateObj.getMonth();
        const startYear = startDateObj.getFullYear();

        // Classifier les clients pour cette semaine
        const weekClients = weekPartners.map((partner: Customer) => {
            const partnerCreateDate = new Date(partner.create_date);
            const partnerMonth = partnerCreateDate.getMonth();
            const partnerYear = partnerCreateDate.getFullYear();

            const isAcquisition = partnerMonth === startMonth && partnerYear === startYear;

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
                totalOrders
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
            chrgBase: `${weekClients.length} (${((weekClients.length / weekClients.length) * 100).toFixed(2)}%)`,
            arpu: `$${weekClients.length > 0 ? (totalCA / weekClients.length).toFixed(0) : 0}`,
            partAcq: `${acquisitions.length} (${stats.partAcq.toFixed(2)}%)`,
            revAcq: `$${caAcquisitions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${stats.revAcq.toFixed(2)}%)`,
            partRec: `$${caRecurrents.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${stats.revRec.toFixed(2)}%)`,
            partGlobal2: (weekClients.length + Math.floor(Math.random() * 10)).toString(), // Simulation de données supplémentaires
            revPartClient2: `$${(totalCA * 0.4).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`,
            chrgBase2: `${Math.floor(weekClients.length * 0.1)} (${((weekClients.length * 0.1 / weekClients.length) * 100).toFixed(2)}%)`,
            arpu2: `$${weekClients.length > 0 ? ((totalCA * 0.4) / Math.floor(weekClients.length * 0.1)).toFixed(0) : 0}`,
            partAcq2: `${Math.floor(acquisitions.length * 0.3)} (${((Math.floor(acquisitions.length * 0.3) / acquisitions.length) * 100).toFixed(2)}%)`,
            revAcq2: `$${(caAcquisitions * 0.4).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} (${((caAcquisitions * 0.4 / caAcquisitions) * 100).toFixed(2)}%)`,
            partRec2: `${Math.floor(recurrents.length * 0.8)} (${((Math.floor(recurrents.length * 0.8) / recurrents.length) * 100).toFixed(2)}%)`
        });
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
                            <th className="text-left py-3 px-4 font-semibold">Parc Global</th>
                            <th className="text-left py-3 px-4 font-semibold">Rev. Part Client</th>
                            <th className="text-left py-3 px-4 font-semibold">Chrg. Base (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">ARPU</th>
                            <th className="text-left py-3 px-4 font-semibold">Part Acq (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Rev Acq (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Part Rec. (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Part Global</th>
                            <th className="text-left py-3 px-4 font-semibold">Rev. Part Client</th>
                            <th className="text-left py-3 px-4 font-semibold">Chrg. Base (%)</th>
                            {/* <th className="text-left py-3 px-4 font-semibold">ARPU</th>
                            <th className="text-left py-3 px-4 font-semibold">Part Acq (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Rev Acq (%)</th>
                            <th className="text-left py-3 px-4 font-semibold">Part Rec. (%)</th> */}
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((week, index) => (
                            <tr key={week.semaine} className="border-b border-gray-100 dark:border-slate-700">
                            <td className="py-3 px-4 font-medium">{week.semaine}</td>
                            <td className="py-3 px-4">{week.partGlobal}</td>
                            <td className="py-3 px-4">{week.revPartClient}</td>
                            <td className="py-3 px-4">{week.chrgBase}</td>
                            <td className="py-3 px-4">{week.arpu}</td>
                            <td className="py-3 px-4">{week.partAcq}</td>
                            <td className="py-3 px-4">{week.revAcq}</td>
                            <td className="py-3 px-4">{week.partRec}</td>
                            <td className="py-3 px-4">{week.partGlobal2}</td>
                            <td className="py-3 px-4">{week.revPartClient2}</td>
                            <td className="py-3 px-4">{week.chrgBase2}</td>
                            {/* <td className="py-3 px-4">{week.arpu2}</td>
                            <td className="py-3 px-4">{week.partAcq2}</td>
                            <td className="py-3 px-4">{week.revAcq2}</td>
                            <td className="py-3 px-4">{week.partRec2}</td> */}
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