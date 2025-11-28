// app/rapport-journalier/page.tsx
import { format } from "date-fns";
import RapportJournalierClient, { ReportData, ShopData } from "./cash-flow.client";

// --- TYPES (copiés ici pour référence, mais peuvent être dans un fichier partagé) ---
// Note: Ces types sont déjà dans le fichier client, donc pas besoin de les redéfinir si vous les exportez.

// --- FONCTIONS DE RÉCUPÉRATION DE DONNÉES (Server-side) ---

async function getOdooDataForDate(date: Date) {
    console.log(`Fetching Odoo data for ${format(date, 'yyyy-MM-dd')}`);
    // Mettez ici vos vrais appels à `getDailySales`, `getDailyExpensesReport`...
    // Exemple : const sales = await getDailySales(date);
    return {
        sales: [], // Remplacez par les vraies ventes
        expenses: [], // Remplacez par les vraies dépenses
    };
}

async function getSupabaseClosureData(date: Date) {
    console.log(`Fetching Supabase closure data before ${format(date, 'yyyy-MM-dd')}`);
    // Mettez ici votre logique pour trouver la dernière clôture valide avant `date`
    // Exemple : const lastClosure = await clotureService.getLastClosureBefore(date);
    return {
        'PB - 24': { s_o: 100.86 },
        'PB - KTM': { s_o: 1.50 },
        'PB - MTO': { s_o: 11.00 },
        'PB - LMB': { s_o: null },
        'PB ONL': { s_o: 2.70 },
    };
}

// --- FONCTION DE TRANSFORMATION ---

async function transformDataForReport(date: Date): Promise<ReportData> {
    console.log("Transforming data for report...");

    const [odooData, supabaseData] = await Promise.all([
        getOdooDataForDate(date),
        getSupabaseClosureData(date),
    ]);

    // ** LOGIQUE DE MAPPING À IMPLÉMENTER **
    // C'est ici que vous convertissez `odooData` et `supabaseData` en `ReportData`.
    // Pour chaque shop, vous calculez chaque ligne du rapport.
    // Exemple pour une ligne:
    // const pb24_charge_personnel = odooData.expenses
    //      .filter(e => e.shop === 'PB - 24' && e.category === 'Personnel')
    //      .reduce((sum, e) => sum + e.amount, 0);

    // En attendant, nous utilisons des données mockées pour l'affichage.
    const shops: ShopData[] = [
        { name: "PB - 24", s_o: supabaseData['PB - 24'].s_o, entree_ventes: 395.00, banque_pos: null, cash_paiement_securite: 50.00, cash_paiement_sal_agents: null, epargne_coffre_fort: null, cash_financement: 360.00, cash_boost_service: null, cash_boost_produit: null, espece_compilee_epargne: null, espece_mobile_money: null, excedent_deficit: null, revenu_beauty: 290.00, out_beauty: 290.00, cumul_revenu_beauty: null, mobile_money_vte_en_cours: null, mobile_money_cumul_sortie: null, mobile_money_cumul_entree: null, versement_associes: null, transfert_cash: 290.00, immobilisation: null, sortie_mobile_money: null, charge_marketing: null, charge_fiscale: null, perte: null, charge_personnel: 3.10, charges_diverses: null, charge_administration: null, charge_marchandise: 164.00, charge_operation: 42.00, support_caisse_externe: null, exploitant_individuel: 13.40, banque_pos_final: null, mobile_money_cumul_final: null },
        { name: "PB - LMB", s_o: supabaseData['PB - LMB'].s_o, entree_ventes: null, banque_pos: null, cash_paiement_securite: null, cash_paiement_sal_agents: null, epargne_coffre_fort: null, cash_financement: null, cash_boost_service: null, cash_boost_produit: null, espece_compilee_epargne: null, espece_mobile_money: null, excedent_deficit: null, revenu_beauty: null, out_beauty: null, cumul_revenu_beauty: null, mobile_money_vte_en_cours: null, mobile_money_cumul_sortie: null, mobile_money_cumul_entree: null, versement_associes: null, transfert_cash: null, immobilisation: null, sortie_mobile_money: null, charge_marketing: null, charge_fiscale: null, perte: null, charge_personnel: null, charges_diverses: null, charge_administration: null, charge_marchandise: null, charge_operation: null, support_caisse_externe: null, exploitant_individuel: null, banque_pos_final: null, mobile_money_cumul_final: null },
        { name: "PB - KTM", s_o: supabaseData['PB - KTM'].s_o, entree_ventes: 223.00, banque_pos: null, cash_paiement_securite: 107.00, cash_paiement_sal_agents: null, epargne_coffre_fort: null, cash_financement: 160.00, cash_boost_service: null, cash_boost_produit: null, espece_compilee_epargne: null, espece_mobile_money: null, excedent_deficit: null, revenu_beauty: 223.00, out_beauty: null, cumul_revenu_beauty: 80.50, mobile_money_vte_en_cours: null, mobile_money_cumul_sortie: null, mobile_money_cumul_entree: null, versement_associes: null, transfert_cash: null, immobilisation: null, sortie_mobile_money: null, charge_marketing: null, charge_fiscale: null, perte: null, charge_personnel: 80.00, charges_diverses: null, charge_administration: 3.00, charge_marchandise: 120.00, charge_operation: null, support_caisse_externe: 100.00, exploitant_individuel: 20.00, banque_pos_final: null, mobile_money_cumul_final: null },
        { name: "PB - MTO", s_o: supabaseData['PB - MTO'].s_o, entree_ventes: 72.00, banque_pos: null, cash_paiement_securite: 29.35, cash_paiement_sal_agents: null, epargne_coffre_fort: null, cash_financement: 94.15, cash_boost_service: null, cash_boost_produit: null, espece_compilee_epargne: 96.00, espece_mobile_money: null, excedent_deficit: null, revenu_beauty: 60.00, out_beauty: 18.00, cumul_revenu_beauty: 42.00, mobile_money_vte_en_cours: null, mobile_money_cumul_sortie: null, mobile_money_cumul_entree: null, versement_associes: null, transfert_cash: null, immobilisation: null, sortie_mobile_money: null, charge_marketing: null, charge_fiscale: null, perte: null, charge_personnel: null, charges_diverses: null, charge_administration: null, charge_marchandise: null, charge_operation: 1.63, support_caisse_externe: null, exploitant_individuel: null, banque_pos_final: null, mobile_money_cumul_final: null },
        { name: "PB ONL", s_o: supabaseData['PB ONL'].s_o, entree_ventes: null, banque_pos: null, cash_paiement_securite: null, cash_paiement_sal_agents: null, epargne_coffre_fort: null, cash_financement: null, cash_boost_service: null, cash_boost_produit: null, espece_compilee_epargne: null, espece_mobile_money: null, excedent_deficit: null, revenu_beauty: null, out_beauty: null, cumul_revenu_beauty: null, mobile_money_vte_en_cours: null, mobile_money_cumul_sortie: null, mobile_money_cumul_entree: null, versement_associes: null, transfert_cash: null, immobilisation: null, sortie_mobile_money: null, charge_marketing: null, charge_fiscale: null, perte: null, charge_personnel: null, charges_diverses: null, charge_administration: null, charge_marchandise: null, charge_operation: null, support_caisse_externe: null, exploitant_individuel: null, banque_pos_final: null, mobile_money_cumul_final: null },
      ];
      
    // Calculer les totaux à partir des données des shops
    const totals = shops.reduce((acc, shop) => {
        for (const key in shop) {
            if (key !== 'name' && typeof shop[key as keyof typeof shop] === 'number') {
                acc[key as keyof typeof acc] = (acc[key as keyof typeof acc] || 0) + (shop[key as keyof typeof shop] as number);
            }
        }
        return acc;
    }, {} as Omit<ShopData, 'name'>);

    return {
      date: date.toISOString(),
      shops,
      totals,
      otherColumns: { zmteo: 155.00 }, // À remplir avec votre logique
    };
}

// --- LA PAGE (Server Component) ---
interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function RapportJournalierPage({ searchParams }: PageProps) {
    const dateParam = searchParams.date as string | undefined;
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    const reportData = await transformDataForReport(selectedDate);
    
    return (
        <RapportJournalierClient initialReportData={reportData} />
    );
}