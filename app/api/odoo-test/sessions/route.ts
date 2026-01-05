// app/api/sessions/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

// GET: Récupérer les sessions ouvertes
export async function GET() {
  try {
    const sessions = await odooCall('pos.session', 'search_read', [], {
      fields: ['name', 'state', 'start_at', 'stop_at', 'config_id'],
      limit: 10,
      order: 'start_at desc' // Les plus récentes d'abord
    });
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Créer et ouvrir une nouvelle session
export async function POST(req: Request) {
  try {
    const { config_id } = await req.json(); // ID du point de vente (ex: 1 pour Shop)
    
    // 1. Créer la session
    const sessionId = await odooCall('pos.session', 'create', [{
      user_id: 1, // Ou l'ID de l'utilisateur connecté
      config_id: Number(config_id)
    }]);

    // 2. IMPORTANT : Ouvrir la session officiellement (Action Server)
    await odooCall('pos.session', 'action_pos_session_open', [[sessionId]]);

    return NextResponse.json({ success: true, sessionId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}