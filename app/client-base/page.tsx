import { CustomerGrouper } from "@/lib/customer-grouping";
import { CustomerCategory, OdooPartner } from "../types/partner";
import { POSOrder } from "../types/pos";
import CustomersClient from "./customers.client";

interface PageProps {
  searchParams: Promise<{
    boutique?: string;
    page?: string;
    category?: CustomerCategory | 'ALL';
    search?: string;
  }>;
}

async function getPartners() {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/res.partner?fields=id,name,phone`,
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

async function getPOSOrders() {
    const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,config_id,create_date,partner_id,amount_paid`,
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

async function getCustomers() {
    const [partnerData, posOrderData] = await Promise.all([
        getPartners(),
        getPOSOrders(),
    ])
    
    const partners = partnerData.records as OdooPartner[];
    const posOrders = posOrderData.records as POSOrder[];
    
    // 1. Filtrer les commandes qui ont un partner_id (client associé)
    const ordersWithPartner = posOrders.filter(order => 
        order.partner_id && order.partner_id[0]
    );

    // 2. Grouper les commandes par partenaire
    const ordersByPartner = new Map<number, POSOrder[]>();
    ordersWithPartner.forEach(order => {
        const partnerId = order.partner_id![0];
        if (!ordersByPartner.has(partnerId)) {
            ordersByPartner.set(partnerId, []);
        }
        ordersByPartner.get(partnerId)!.push(order);
    });

    const customers = partners
        .filter(partner => ordersByPartner.has(partner.id))
        .map(partner => {
            const orders = ordersByPartner.get(partner.id) || [];
            const orderDates = orders.map(o => o.date_order || o.create_date).sort();

            return {
                id: partner.id,
                name: partner.name,
                phone: partner.phone,
                email: partner.email,
                orderCount: orders.length,
                totalSpent: orders.reduce((sum, order) => sum + (order.amount_paid || 0), 0),
                firstOrderDate: orderDates[0] || '',
                lastOrderDate: orderDates[orderDates.length - 1] || ''
            };
        })

    // 4. REGROUPEMENT PAR NUMÉRO DE TÉLÉPHONE
    const groupedCustomers = CustomerGrouper.groupCustomersByPhone(customers);

    // 5. Générer le rapport
    // CustomerGrouper.generateMergeReport(groupedCustomers, customers.length);

    return groupedCustomers;
}

export default async function ClientBasePage({searchParams}: PageProps) {
    const params = await searchParams
    const groupedCustomers = await getCustomers();
    
    return (
        <CustomersClient initialCustomers={groupedCustomers} searchParams={params} />
    )
}