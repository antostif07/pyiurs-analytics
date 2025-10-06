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

// Interfaces pour typer les données Odoo
interface OdooProduct {
  id: number;
  name: string;
  categ_id: [number, string];
  product_variant_id: [number];
  list_price: number;
}

interface POSOrderLine {
  id: number;
  order_id: [number];
  product_id: [number];
  qty: number;
  price_subtotal_incl: number;
  price_unit: number;
}

interface ProductInfo {
  name: string;
  list_price: number;
}

interface OrderLineWithDetails extends POSOrderLine {
  product_name: string;
  product_list_price: number;
  order_name: string;
  order_date: string;
}

interface OrderDetail {
  order_id: number;
  order_name: string;
  order_date: string;
  amount_paid: number;
  lines: OrderLineWithDetails[];
}

async function getPartners() {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/res.partner?fields=id,name,phone,email`,
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
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,config_id,create_date,partner_id,amount_paid,date_order,name`,
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

async function getPOSOrderLines() {
    const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,order_id,product_id,qty,price_subtotal_incl,price_unit,product_id`,
    { 
      next: { 
        revalidate: 300 // 5 minutes
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Lignes de commande POS");
  }

  return res.json();
}

async function getBeautyProducts() {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,categ_id,product_variant_id,list_price&domain=[[\"categ_id\",\"ilike\",\"beauty\"]]`,
        { 
            next: { 
                revalidate: 300 // 5 minutes
            } 
        }
    );
    
    if (!res.ok) {
        throw new Error("Erreur API Odoo - Produits beauté");
    }

    return res.json();
}

// Fonction pour nettoyer le nom du produit
function cleanProductName(productName: string): string {
  if (!productName) return 'Produit inconnu';
  
  // Supprimer le code-barre à la fin (le dernier crochet)
  // Exemple: "CeraVe : Gel-Crème Hydratant Oil Control 52ML [3337875904513][COS1108]" 
  // → "CeraVe : Gel-Crème Hydratant Oil Control 52ML [3337875904513]"
  
  // Trouver le dernier crochet fermant
  const lastBracketIndex = productName.lastIndexOf(']');
  const secondLastBracketIndex = productName.lastIndexOf('[', lastBracketIndex - 1);
  
  if (lastBracketIndex !== -1 && secondLastBracketIndex !== -1) {
    // Vérifier si c'est bien un code-barre (format avec chiffres)
    const potentialBarcode = productName.substring(secondLastBracketIndex + 1, lastBracketIndex);
    if (/^[A-Z0-9]+$/.test(potentialBarcode)) {
      // C'est un code-barre, on le supprime
      return productName.substring(0, secondLastBracketIndex).trim();
    }
  }
  
  // Si le format n'est pas reconnu, retourner le nom original
  return productName.trim();
}

async function getBeautyCustomers() {
    const [partnerData, posOrderData, posOrderLinesData, beautyProductsData] = await Promise.all([
        getPartners(),
        getPOSOrders(),
        getPOSOrderLines(),
        getBeautyProducts()
    ])
    
    const partners = partnerData.records as OdooPartner[];
    const posOrders = posOrderData.records as POSOrder[];
    const posOrderLines = posOrderLinesData.records as POSOrderLine[];
    const beautyProducts = beautyProductsData.records as OdooProduct[];
    
    // 1. Créer un Set des IDs des variants de produits beauté et un Map pour les noms
    const beautyProductVariantIds = new Set(
        beautyProducts.map(product => product.product_variant_id[0])
    );
    
    const productNamesMap = new Map<number, ProductInfo>(
        beautyProducts.map(product => [product.product_variant_id[0], {
            name: cleanProductName(product.name), // Nettoyer le nom ici
            list_price: product.list_price
        }])
    );

    // 2. Filtrer les lignes de commande pour ne garder que les produits de beauté
    const beautyOrderLines = posOrderLines.filter(line => 
        line.product_id && line.product_id[0] && beautyProductVariantIds.has(line.product_id[0])
    );

    // 3. Grouper les lignes de commande beauté par partenaire
    const beautyLinesByPartner = new Map<number, OrderLineWithDetails[]>();
    const orderDatesByPartner = new Map<number, string[]>();
    const orderDetailsByPartner = new Map<number, OrderDetail[]>();
    
    // Créer un Map pour accéder rapidement aux commandes par ID
    const ordersById = new Map<number, POSOrder>();
    posOrders.forEach(order => {
        ordersById.set(order.id, order);
    });

    beautyOrderLines.forEach(line => {
        const order = ordersById.get(line.order_id[0]);
        if (!order || !order.partner_id || !order.partner_id[0]) return;

        const partnerId = order.partner_id[0];
        
        // Ajouter la ligne de commande beauté
        if (!beautyLinesByPartner.has(partnerId)) {
            beautyLinesByPartner.set(partnerId, []);
        }
        
        const productInfo = productNamesMap.get(line.product_id[0]) || { name: 'Produit inconnu', list_price: 0 };
        const lineWithDetails: OrderLineWithDetails = {
            ...line,
            product_name: productInfo.name, // Nom déjà nettoyé
            product_list_price: productInfo.list_price,
            order_name: order.name,
            order_date: order.date_order || order.create_date
        };
        
        beautyLinesByPartner.get(partnerId)!.push(lineWithDetails);
        
        // Ajouter la date de commande
        if (!orderDatesByPartner.has(partnerId)) {
            orderDatesByPartner.set(partnerId, []);
        }
        const orderDate = order.date_order || order.create_date;
        if (orderDate && !orderDatesByPartner.get(partnerId)!.includes(orderDate)) {
            orderDatesByPartner.get(partnerId)!.push(orderDate);
        }
        
        // Stocker les détails des commandes pour l'expand
        if (!orderDetailsByPartner.has(partnerId)) {
            orderDetailsByPartner.set(partnerId, []);
        }
        const existingOrder = orderDetailsByPartner.get(partnerId)!.find(o => o.order_id === order.id);
        if (!existingOrder) {
            orderDetailsByPartner.get(partnerId)!.push({
                order_id: order.id,
                order_name: order.name,
                order_date: order.date_order || order.create_date,
                amount_paid: order.amount_paid,
                lines: [lineWithDetails]
            });
        } else {
            existingOrder.lines.push(lineWithDetails);
        }
    });

    const customers = partners
        .filter(partner => beautyLinesByPartner.has(partner.id))
        .map(partner => {
            const beautyLines = beautyLinesByPartner.get(partner.id) || [];
            const orderDates = (orderDatesByPartner.get(partner.id) || []).sort();
            const orderDetails = orderDetailsByPartner.get(partner.id) || [];
            
            // Calculer le total uniquement sur les lignes de produits beauté
            const totalBeautySpent = beautyLines.reduce((sum, line) => 
                sum + (line.price_subtotal_incl || 0), 0
            );
            
            // Compter uniquement les commandes distinctes contenant des produits beauté
            const beautyOrderCount = new Set(beautyLines.map(line => line.order_id[0])).size;

            return {
                id: partner.id,
                name: partner.name,
                phone: partner.phone,
                email: partner.email,
                orderCount: beautyOrderCount,
                totalSpent: totalBeautySpent,
                firstOrderDate: orderDates[0] || '',
                lastOrderDate: orderDates[orderDates.length - 1] || '',
                orderDetails: orderDetails.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
            };
        })

    // 6. REGROUPEMENT PAR NUMÉRO DE TÉLÉPHONE
    const groupedCustomers = CustomerGrouper.groupCustomersByPhone(customers);

    return groupedCustomers;
}

export default async function BeautyClientsPage({searchParams}: PageProps) {
    const params = await searchParams
    const groupedCustomers = await getBeautyCustomers();
    
    return (
        <CustomersClient 
            initialCustomers={groupedCustomers} 
            searchParams={params} 
            title="Clients Produits de Beauté"
            description="Gestion des clients ayant acheté des produits de la catégorie beauté"
        />
    )
}