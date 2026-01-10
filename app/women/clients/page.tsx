import { Users, Crown, AlertOctagon } from "lucide-react";
import { getTopCustomers } from "../actions/customers";
import CustomerTable from "../components/CustomerTable";

export const metadata = { title: "Clients & Fidélité • Pyiurs Femme" };

export default async function ClientsPage() {
  const customers = await getTopCustomers(100);

  // Stats rapides
  const vipCount = customers.filter(c => c.segment === 'VIP').length;
  const riskCount = customers.filter(c => c.segment === 'AT_RISK').length;
  const totalRev = customers.reduce((acc, c) => acc + c.total_spent, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Clients & Fidélité</h1>
        <p className="text-slate-500 mt-1">Segmentation automatique basée sur les achats "Femme" des 12 derniers mois.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-center justify-between">
           <div>
             <p className="text-amber-800 text-sm font-bold uppercase">Clients VIP</p>
             <p className="text-3xl font-bold text-amber-900 mt-1">{vipCount}</p>
           </div>
           <Crown className="w-8 h-8 text-amber-500 opacity-50"/>
        </div>

        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
           <div>
             <p className="text-red-800 text-sm font-bold uppercase">À Risque (Relancer)</p>
             <p className="text-3xl font-bold text-red-900 mt-1">{riskCount}</p>
           </div>
           <AlertOctagon className="w-8 h-8 text-red-500 opacity-50"/>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
              <p className="text-slate-500 text-sm font-bold uppercase">CA Top 100</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                  {totalRev ? totalRev.toLocaleString() : 0} <span className="text-lg text-slate-400">$</span>
              </p>
          </div>
          <Users className="w-8 h-8 text-slate-400 opacity-50"/>
        </div>
      </div>

      {/* Table */}
      <CustomerTable data={customers} />

    </main>
  );
}