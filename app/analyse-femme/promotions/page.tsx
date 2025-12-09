import { getDeadStockCandidates } from "../actions/stocks";
import PromoSimulator from "./PromoSimulator";

export const metadata = { title: "Simulateur Promo • Pyiurs Femme" };

export default async function PromoPage() {
  const candidates = await getDeadStockCandidates();

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
       <PromoSimulator initialData={candidates} />
    </main>
  );
}