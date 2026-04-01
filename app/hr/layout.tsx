// app/hr/layout.tsx
import { HRProvider } from "./_components/hr-context";
import Sidebar from "./_components/Sidebar";
import { Header } from "./_components/header";
import { MobileOverlay } from "./_components/mobile-overlay";

export const metadata = {
  title: "Gestion RH | Entreprise Name",
  description: "Portail de gestion des ressources humaines",
};

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <HRProvider>
      <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950">
        {/* Sidebar - La logique d'ouverture est gérée en interne via le hook */}
        <Sidebar />

        <MobileOverlay />

        <div className="flex flex-1 flex-col min-w-0 lg:pl-64">
          <Header />

          <main className="flex-1 overflow-y-auto outline-none">
            <div className="p-4 lg:p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                {children}
              </div>
            </div>
          </main>
          
          {/* Footer d'entreprise optionnel */}
          <footer className="py-4 px-8 border-t border-slate-200 bg-white text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Entreprise - Module RH v1.2.0
          </footer>
        </div>
      </div>
    </HRProvider>
  );
}