import { cn } from "@/lib/utils";

export default function RowItem({ label, icon, total, values, shops, isLastInSection = false }: any) {
    return (
      <tr className={cn(
          "border-b border-slate-50 dark:border-slate-800 hover:bg-indigo-50/10 transition-colors group",
          isLastInSection && "border-b-2 border-b-slate-100 dark:border-b-slate-800"
      )}>
        <td className="px-4 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
            <span className="truncate whitespace-nowrap">{label}</span>
          </div>
        </td>
        <td className="px-4 py-1.5 text-right font-mono font-bold text-[11px] text-indigo-600 bg-indigo-50/5 tabular-nums min-w-[110px] border-r border-indigo-100/30">
          {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
        </td>
        {shops.map((shop: any) => (
          <td key={shop.id} className="px-4 py-1.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-500 tabular-nums min-w-[100px] border-r border-slate-50 dark:border-slate-800 last:border-r-0">
            {(values[shop.id] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} $
          </td>
        ))}
      </tr>
    );
}