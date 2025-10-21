import { FinancialReport } from "../types/management";
import { POSOrderLine } from "../types/pos";
import FundsClient from "./funds.client";

// Interface pour les props de la page
interface PageProps {
  searchParams: Promise<{
    agent?: string;
    date?: string;
    category?: string;
    type?: string;
  }>;
}

async function getPOSOrderLines(date?: string) {
    console.log(date);
    
    let domain = `[["create_date", ">=", "${date} 00:01:00"], ["create_date", "<=", "${date} 23:59:59"]]`;

    if(!date){
        const newDate = new Date();
        
        domain = `[["create_date", ">=", "${newDate.getFullYear()}-${(newDate.getMonth()+1).toString().padStart(2, '0')}-${newDate.getDate()} 00:01:00"], ["create_date", "<=", "${newDate.getFullYear()}-${(newDate.getMonth()+1).toString().padStart(2, '0')}-${newDate.getDate()} 23:59:59"]]`;
    }

    const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,name,product_id,price_unit,full_product_name,order_id&domain=${domain}`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Lignes de commande POS");
  }

  return res.json();
}

async function getFinancialData(date?: string): Promise<FinancialReport> {
    const posOrderLines = await getPOSOrderLines(date);

    const beautyRevenue = posOrderLines.records.filter((line: POSOrderLine) => line.full_product_name.includes("[COS")).reduce((sum: number, line: POSOrderLine) => sum + (line.price_unit * line.qty), 0);
    const otherRevenue = posOrderLines.records.filter((line: POSOrderLine) => !line.full_product_name.includes("[COS")).reduce((sum: number, line: POSOrderLine) => sum + (line.price_unit * line.qty), 0);
    // const totalRevenue = beautyRevenue + otherRevenue;
    
    // Simulation des données - à remplacer par votre API
    const mockData: FinancialReport = {
        reportDate: date || new Date().toISOString().split('T')[0],
        totalBalance: 1500000,
        monthlyFlow: 250000,
        policy: {
        beautyRevenue: beautyRevenue,
        allowedOperations: ["Achat Produits", "Paiement Fret", "Paiement Salaire", "Paiement Boost"],
        otherRevenue: otherRevenue /2
        },
        allocations: {
        merchandise: ["Achat Marchandises", "Paiement Frei"],
        reserves: ["Un mois", "Loyer", "Marketing Boost", "Financement", "Personnel", "Total Epargne"]
        },
        productBreakdown: {
        P24: 190,
        PMTO: 80,
        RKTAI: 115,
        PLMBI: 75,
        PGNL: 45
        },
        transactions: [
        {
            id: 1,
            date: "2025-10-13",
            amount: 500000,
            type: "DEPOSIT",
            category: "Vente Produits",
            description: "Vente P24 et PMTO",
            status: "COMPLETED",
            balanceAfter: 1500000,
            agent: "Jules Nazra",
            location: "Bureau Central"
        },
        {
            id: 2,
            date: "2025-10-12",
            amount: 250000,
            type: "WITHDRAWAL",
            category: "Paiement Salaire",
            description: "Salaire personnel",
            status: "COMPLETED",
            balanceAfter: 1000000,
            agent: "Jules Nazra",
            location: "Bureau Central"
        },
        {
            id: 3,
            date: "2025-10-10",
            amount: 300000,
            type: "DEPOSIT",
            category: "Autres Revenus",
            description: "Vente divers",
            status: "COMPLETED",
            balanceAfter: 1250000,
            agent: "Jules Nazra",
            location: "Bureau Central"
        }
        ]
    };

    return mockData;
}

export default async function FundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const financialData = await getFinancialData(params.date);
  
  return (
    <FundsClient 
      financialData={financialData}
      searchParams={params}
    />
  );
}