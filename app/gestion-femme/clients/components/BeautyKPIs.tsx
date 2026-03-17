import { getBeautyKPIs } from "../actions";
import { Users, Crown, ShoppingBag, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default async function BeautyKPIs() {
  const data = await getBeautyKPIs();

  const stats = [
    { title: "Clients Beauty", value: data.totalClients, icon: <Users className="text-rose-600" />, color: "bg-rose-50" },
    { title: "Chiffre d'Affaires", value: `${data.totalRevenue.toLocaleString()} $`, icon: <TrendingUp className="text-emerald-600" />, color: "bg-emerald-50" },
    { title: "Clients Gold (>1k$)", value: data.vipGold, icon: <Crown className="text-amber-500" />, color: "bg-amber-50" },
    { title: "Panier Moyen", value: `${data.avgBasket} $`, icon: <ShoppingBag className="text-blue-600" />, color: "bg-blue-50" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="p-6 border-none shadow-sm rounded-[24px] bg-white flex flex-col gap-4 group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className={`w-10 h-10 rounded-2xl ${stat.color} flex items-center justify-center shadow-sm`}>
              {stat.icon}
            </div>
            <ArrowUpRight size={16} className="text-gray-300 group-hover:text-rose-500 transition-colors" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 leading-tight">{stat.value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.title}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}