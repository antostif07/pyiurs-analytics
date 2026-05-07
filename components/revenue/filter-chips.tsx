// components/revenue/filter-chips.tsx
import { X } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export function FilterChips() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeFilters = Array.from(searchParams.entries()).filter(
    ([key]) => !['month', 'year', 'page'].includes(key) && searchParams.get(key)
  );

  if (activeFilters.length === 0) return null;

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {activeFilters.map(([key, value]) => (
        <div key={key} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-medium border border-indigo-100">
          <span className="uppercase text-[9px] font-bold opacity-70">{key}:</span>
          <span>{value.length > 15 ? value.slice(0, 15) + '...' : value}</span>
          <button onClick={() => removeFilter(key)} className="hover:text-indigo-900 ml-1">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}