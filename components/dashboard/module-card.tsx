import { AppModule } from "@/lib/constants";
import Link from "next/link";

export const ModuleCard = ({ module }: { module: AppModule }) => {
  const Icon = module.icon;
  return (
    <Link href={module.href} className="group outline-none block h-full">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 h-full border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 flex flex-col focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${module.color} text-white shadow-sm`}>
            <Icon size={24} strokeWidth={2} />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {module.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed flex-grow">
          {module.description}
        </p>
      </div>
    </Link>
  );
};