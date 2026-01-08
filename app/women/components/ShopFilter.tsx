"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Store } from "lucide-react";

type Shop = { id: number; name: string };

export default function ShopFilter({ shops }: { shops: Shop[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentShop = searchParams.get("store") || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("store", e.target.value);
    } else {
      params.delete("store"); // "Tous les magasins"
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
      <Store className="w-4 h-4 text-slate-500" />
      <select 
        value={currentShop}
        onChange={handleChange}
        className="text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer outline-none min-w-[150px]"
      >
        <option value="">Tous les magasins</option>
        <hr />
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </select>
    </div>
  );
}