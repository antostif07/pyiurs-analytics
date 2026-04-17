import { cn } from "@/lib/utils";

export default function SectionHeader({ label, icon, color, colSpan }: any) {
    return (
      <tr className="bg-slate-50/30 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
        <td colSpan={colSpan} className="px-4 py-1.5 sticky left-0 z-10">
          <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded-md text-white", color)}>{icon}</div>
              <span className="text-[10px] font-black tracking-widest text-slate-500">{label}</span>
          </div>
        </td>
      </tr>
    );
}