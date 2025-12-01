import { Tag } from 'lucide-react';
import Link from 'next/link';
import { getPromoCandidates } from '../../actions';
import PromoWizard from '../../components/PromoWizard';

export default async function CreatePromoPage() {
  const candidates = await getPromoCandidates();

  return (
    <div className="min-h-screen relative">
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Tag className="text-gray-400" /> Nouvelle Campagne Promo
            </h1>
            <p className="text-gray-500 text-sm mt-1">Sélectionnez les références à liquider.</p>
        </div>
        <Link href="/dashboard/promos" className="text-sm font-medium text-gray-500 hover:text-gray-900">
            Annuler et retour
        </Link>
      </div>

      <PromoWizard candidates={candidates} />
    </div>
  );
}