// app/api/sessions/close/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { sessionId, endDate } = await req.json();

    // 1. D'abord, on tente de fermer la session proprement
    // Cela génère les écritures comptables
    try {
        await odooCall('pos.session', 'action_pos_session_closing_control', [[sessionId]]);
    } catch (e) {
        // Parfois Odoo renvoie une action "Wizard" au lieu de juste fermer si les montants ne matchent pas.
        // Pour un outil d'admin/import, on peut parfois vouloir forcer l'état (attention à la compta).
        console.warn("Fermeture standard a rencontré une action ou erreur, on continue pour la date...");
    }

    // 2. On force la date de fermeture et l'état (sécurité)
    // C'est CRUCIAL pour les imports historiques
    await odooCall('pos.session', 'write', [
      [sessionId],
      { 
        stop_at: endDate, // Format: "YYYY-MM-DD HH:mm:ss"
        state: 'closed'   // On force le statut fermé au cas où l'étape 1 a bloqué
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}