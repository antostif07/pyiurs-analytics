import xmlrpc from 'xmlrpc';

const ODOO_URL = process.env.ODOO_URL || 'https://pyiurs.odoo.com';
const ODOO_DB = process.env.ODOO_DB || 'pyiurs';
const ODOO_USERNAME = process.env.ODOO_USERNAME || 'arnold.bopeto@pyiurs.com';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || '';

// Détection HTTPS pour choisir le bon client
const createClient = (urlStr: string) => {
  const url = new URL(urlStr);
  const clientParams = { host: url.hostname, port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80), path: '/xmlrpc/2/object' };
  const commonParams = { ...clientParams, path: '/xmlrpc/2/common' };
  
  return {
    common: url.protocol === 'https:' ? xmlrpc.createSecureClient(commonParams) : xmlrpc.createClient(commonParams),
    object: url.protocol === 'https:' ? xmlrpc.createSecureClient(clientParams) : xmlrpc.createClient(clientParams)
  };
};

const clients = createClient(ODOO_URL);

// --- CACHING DE L'UID ---
// On stocke la promesse de l'UID pour éviter de se reconnecter à chaque requête
// et pour gérer les requêtes simultanées (Promise Singleton)
let uidPromise: Promise<number> | null = null;

const getOdooUid = (): Promise<number> => {
  if (uidPromise) return uidPromise;

  uidPromise = new Promise((resolve, reject) => {
    clients.common.methodCall('authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}], (error, uid) => {
      if (error) {
        uidPromise = null; // On reset en cas d'erreur pour pouvoir réessayer
        console.error("❌ Odoo Auth Error:", error);
        return reject(error);
      }
      if (!uid) {
        uidPromise = null;
        return reject(new Error('Authentification Odoo échouée (UID vide)'));
      }
      console.log("✅ Odoo Connected with UID:", uid);
      resolve(uid);
    });
  });

  return uidPromise;
};

// --- CLIENT PRINCIPAL ---
export const odooClient = {
  /**
   * Exécute une méthode générique (execute_kw)
   */
  execute: async (model: string, method: string, args: any[] = [], kwargs: any = {}) => {
    try {
      const uid = await getOdooUid();
      return new Promise((resolve, reject) => {
        clients.object.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs], (err, value) => {
          if (err) return reject(err);
          resolve(value);
        });
      });
    } catch (e) {
      throw e;
    }
  },

  /**
   * Helper spécifique pour search_read (Le plus utilisé pour les dashboards)
   * Simplifie l'écriture des requêtes
   */
  searchRead: async (model: string, options: { domain?: any[], fields?: string[], limit?: number, offset?: number, order?: string } = {}) => {
    const { domain = [], fields = [], limit = 0, offset = 0, order = '' } = options;
    return odooClient.execute(model, 'search_read', [domain], { fields, limit, offset, order });
  },

  /**
   * Helper pour compter les éléments (rapide pour les stats)
   */
  searchCount: async (model: string, domain: any[] = []) => {
    return odooClient.execute(model, 'search_count', [domain]) as Promise<number>;
  }
};