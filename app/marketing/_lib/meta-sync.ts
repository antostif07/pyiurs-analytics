// /app/marketing/_lib/meta-sync.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getMetaCampaigns } from "./meta-actions";

export async function syncMetaToCalendar(from: string, to: string) {
    const supabase = await createClient();
  // 1. On récupère les vraies campagnes de Meta
  const metaAds = await getMetaCampaigns({ from, to });

  // 2. On récupère les événements planifiés dans Supabase
  const { data: supabaseEvents } = await supabase
    .from('marketing_calendar')
    .select('*')
    .gte('scheduled_at', from)
    .lte('scheduled_at', to);

  // 3. Fusion des deux sources pour le calendrier
  const unifiedEvents = [
    ...(supabaseEvents || []).map(e => ({
      id: e.id,
      title: e.title,
      type: e.platform, // facebook, whatsapp...
      category: e.task_type, // boost, publication...
      date: new Date(e.scheduled_at),
      status: e.status,
      isExternal: false
    })),
    ...(metaAds || []).map((ad: { id: any; name: any; start_date: any; status: string; spend: any; }) => ({
      id: ad.id,
      title: `[LIVE] ${ad.name}`,
      type: 'facebook',
      category: 'campaign',
      date: new Date(ad.start_date || from),
      status: ad.status === 'active' ? 'published' : 'scheduled',
      isExternal: true, // Pour afficher une icône "Lien Meta"
      spend: ad.spend
    }))
  ];

  return unifiedEvents;
}