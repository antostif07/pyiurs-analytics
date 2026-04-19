import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import { Suspense } from "react";
import SansCodeClient from "./sans-code-client";

export default function SansCodePage() {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-foreground">
      
      {/* Background décoratif */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Contenu principal */}
      <section className="relative max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Contenu */}
        <Suspense
          fallback={
            <div className="space-y-6 animate-in fade-in duration-300">
              <DashboardSkeleton />
            </div>
          }
        >
          <SansCodeClient />
        </Suspense>
      </section>
    </main>
  );
}