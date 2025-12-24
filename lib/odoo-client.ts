// lib/odoo.ts
import { Odoo } from "@rlizana/odoo-rpc";

let odoo: Odoo | null = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export async function getOdoo() {
  // Si déjà en cours de connexion, attendre
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getOdoo();
  }

  if (!odoo) {
    isConnecting = true;
    try {
      console.log('🔗 Connexion à Odoo...');
      odoo = new Odoo("http://pyiurs.odoo.com", "pyiurs");
      await odoo.login(process.env.ODOO_USERNAME!, process.env.ODOO_PASSWORD!);
      connectionAttempts = 0; // Réinitialiser le compteur
      console.log('✅ Connexion Odoo réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion Odoo:', error);
      odoo = null;
      throw error;
    } finally {
      isConnecting = false;
    }
  }
  return odoo;
}

// Fonction pour vérifier si la session est toujours valide
async function checkSession() {
  try {
    const odooInstance = await getOdoo();
    // Tester la session avec une requête simple
    await odooInstance.env('res.users').search([]).read(['id']);
    return true;
  } catch (error) {
    console.log(`🔄 Session Odoo expirée, reconnexion nécessaire: ${error}`);
    return false;
  }
}

// Fonction pour se reconnecter
async function reconnectOdoo() {
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    throw new Error('Nombre maximum de tentatives de connexion atteint');
  }

  connectionAttempts++;
  console.log(`🔄 Tentative de reconnexion ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
  
  // Réinitialiser l'instance
  odoo = null;
  isConnecting = false;
  
  // Attendre un peu avant de réessayer
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return await getOdoo();
}

export async function fetchFromOdoo(
  model: string,
  fields: string[] = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  domain: any[] = [],
  options: { limit?: number; offset?: number } = {}
) {
  try {
    // Vérifier d'abord si la session est valide
    const isSessionValid = await checkSession();
    if (!isSessionValid) {
      console.log('🔄 Session expirée, reconnexion...');
      await reconnectOdoo();
    }

    const odoo = await getOdoo();
    
    const query = odoo.env(model).search(domain);
    
    // Appliquer les options de pagination si fournies
    // if (options.limit) {
    //   query = query.limit(options.limit);
    // }
    // if (options.offset) {
    //   query = query.offset(options.offset);
    // }
    
    const records = await query.read([...fields]);
    
    // Réinitialiser le compteur en cas de succès
    connectionAttempts = 0;
    
    return { success: true, records };
  } catch (error: unknown) {
    console.error(`❌ Erreur Odoo (${model}):`, error);
    
    // Si c'est une erreur de session, tenter une reconnexion
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS && 
        (typeof error === 'string' && error.includes('session') || 
         (error instanceof Error && error.message.includes('session')))) {
      console.log('🔄 Tentative de reconnexion après erreur...');
      try {
        await reconnectOdoo();
        // Réessayer la requête après reconnexion
        return await fetchFromOdoo(model, fields, domain, options);
      } catch (retryError) {
        console.error('❌ Échec de la reconnexion:', retryError);
      }
    }
    
    return { 
      success: false, 
      error: typeof error === "object" && error !== null && "message" in error 
        ? (error as { message: string }).message 
        : String(error) 
    };
  }
}

// Fonction utilitaire pour les appels avec pagination automatique
export async function fetchAllFromOdoo(
  model: string,
  fields: string[] = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  domain: any[] = [],
  batchSize: number = 1000
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allRecords: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchFromOdoo(model, fields, domain, {
      limit: batchSize,
      offset: offset
    });

    if (!result.success) {
      throw new Error(result.error as string);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = result.records as any[];
    
    if (records.length === 0) {
      hasMore = false;
    } else {
      allRecords = [...allRecords, ...records];
      offset += batchSize;
      
      // Si on a reçu moins de records que la limite, c'est qu'on a tout récupéré
      if (records.length < batchSize) {
        hasMore = false;
      }
    }
  }

  return { success: true, records: allRecords };
}

// Fonction pour forcer une déconnexion (utile pour les tests)
export async function disconnectOdoo() {
  if (odoo) {
    // Note: La librairie @rlizana/odoo-rpc ne semble pas avoir de méthode logout explicite
    // On se contente de réinitialiser l'instance
    odoo = null;
    connectionAttempts = 0;
    isConnecting = false;
    console.log('🔒 Déconnexion Odoo');
  }
}