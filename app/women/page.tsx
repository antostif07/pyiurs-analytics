import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Si tu utilises shadcn/ui (recommandé)
import { getWomenDashboardStats } from './services';
// Sinon utilise des divs classiques avec Tailwind

export const revalidate = 60; // Rafraichir les données toutes les 60 secondes max

export default async function WomenDashboard() {
  // Récupération des données direct depuis Odoo
  const stats = await getWomenDashboardStats();

  if (!stats) return <div>Erreur de connexion à Odoo...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Segment Femme</h1>
        <span className="text-sm text-muted-foreground">Aujourd'hui (Live Odoo)</span>
      </div>

      {/* KPI GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Chiffre d'Affaires */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} USD</div>
            <p className="text-xs text-muted-foreground">+20.1% par rapport à hier</p> 
            {/* Note: Pour le %, il faudra faire un 2ème appel Odoo pour J-1 */}
          </CardContent>
        </Card>

        {/* Panier Moyen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier Moyen (AOV)</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageBasket.toLocaleString()} USD</div>
            <p className="text-xs text-muted-foreground">Sur {stats.ordersCount} tickets</p>
          </CardContent>
        </Card>

        {/* Articles Vendus */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles Sortis</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.itemsSold}</div>
            <p className="text-xs text-muted-foreground">Hors cosmétiques</p>
          </CardContent>
        </Card>

        {/* Objectif (Donnée Supabase à venir) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objectif Jour</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-- %</div>
            <p className="text-xs text-muted-foreground">Donnée Supabase à configurer</p>
          </CardContent>
        </Card>

      </div>
      
      {/* Zone pour les prochains widgets (Graphiques, Tableaux...) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <div className="col-span-4 bg-muted/50 h-75 rounded-xl border flex items-center justify-center">
            Graphique des ventes (À faire)
         </div>
         <div className="col-span-3 bg-muted/50 h-75 rounded-xl border flex items-center justify-center">
            Top Produits du jour (À faire)
         </div>
      </div>
    </div>
  );
}