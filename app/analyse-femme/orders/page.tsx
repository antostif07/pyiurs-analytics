import { getOrdersAnalysis } from "../actions/orders";
import OrdersDashboard from "../components/OrdersDashboard";

export const metadata = { title: "Commandes & Retours • Pyiurs Femme" };

export default async function OrdersPage() {
  const data = await getOrdersAnalysis();

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Commandes & Retours</h1>
        <p className="text-slate-500 mt-1">
          Suivi des flux transactionnels et analyse des motifs de retour.
        </p>
      </div>

      <OrdersDashboard data={data} />
    </main>
  );
}