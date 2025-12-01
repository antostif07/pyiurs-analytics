import { FileText, Printer } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  return (
    <div className="min-h-screen">
       <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
             <FileText className="text-gray-600" size={32} /> Rapports & Exports
        </h1>
        <p className="text-gray-500 mt-1">Générez des documents pour vos réunions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARTE RAPPORT HEBDOMADAIRE */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Printer size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Rapport Hebdomadaire</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">
                Contient le CA de la semaine, le Top Ventes, les Stats Marketing et le Stock Dormant.
            </p>
            
            <Link href="/marketing/reports/print" target="_blank">
                <button className="bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                    Ouvrir la version imprimable
                </button>
            </Link>
        </div>

      </div>
    </div>
  );
}