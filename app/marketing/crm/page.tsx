import { MessageCircle, Phone, User, ShoppingBag, Star } from 'lucide-react';
import { getCRMClients } from '../actions';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export default async function CRMPage() {
  const clients = await getCRMClients();

  return (
    <div className="min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <User className="text-green-600" size={32} /> Clienteling & Relance
            </h1>
            <p className="text-gray-500 mt-1">Vos 50 meilleurs clients. Activez-les !</p>
        </div>
        <div className="bg-green-50 text-green-800 px-4 py-2 rounded-xl text-sm font-bold">
            {clients.length} Clients VIP détectés
        </div>
      </div>

      {/* GRILLE CLIENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {clients.map((client: any) => (
          <div key={client.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            
            {/* Info Client */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                        {client.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 truncate max-w-[120px]" title={client.name}>
                            {client.name}
                        </h3>
                        <p className="text-xs text-gray-400">Client depuis {client.since}</p>
                    </div>
                </div>
                {/* Badge VIP si gros montant (ex: > 100k) */}
                {client.totalSpent > 100000 && (
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                )}
            </div>

            {/* Stats Rapides */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <div className="text-xs text-gray-400 uppercase flex justify-center items-center gap-1">
                        <ShoppingBag size={10} /> Commandes
                    </div>
                    <div className="font-bold text-gray-800">{client.orderCount}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <div className="text-xs text-gray-400 uppercase">Total Acheté</div>
                    <div className="font-bold text-blue-600 text-sm">{formatCurrency(client.totalSpent)}</div>
                </div>
            </div>
            
            {/* ACTIONS WHATSAPP (Scénarios) */}
            <div className="space-y-2">
                
                {/* 1. Nouveauté */}
                <a 
                  href={`https://wa.me/${client.whatsappLink}?text=Bonjour ${client.name.split(' ')[0]} ! C'est l'équipe Pyiurs. On vient de recevoir des nouveautés magnifiques 😍. Jetez un œil ici : pyiurs.com`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-green-50 text-green-700 text-sm font-bold rounded-lg hover:bg-green-100 transition-colors"
                >
                    <MessageCircle size={16} /> Nouveautés
                </a>

                {/* 2. Promo / Relance */}
                <a 
                  href={`https://wa.me/${client.whatsappLink}?text=Coucou ${client.name.split(' ')[0]}, ça fait longtemps ! On a une petite offre spéciale pour vous cette semaine... Passez nous voir ! ✨`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <MessageCircle size={16} /> Relance Douce
                </a>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}