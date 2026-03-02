import xmlrpc from 'xmlrpc';

const ODOO_URL = process.env.ODOO_URL || 'https://pyiurs.odoo.com';
const ODOO_DB = process.env.ODOO_DB || 'pyiurs';
const ODOO_USERNAME = process.env.ODOO_USERNAME || 'arnold.bopeto@pyiurs.com';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || '';

// --- TYPES DE BASE ODOO ---

// Un domaine Odoo est un tableau de triplets : ['champ', 'opérateur', 'valeur']
export type OdooDomain = [string, string, unknown][];

// Options pour la recherche
export interface SearchReadOptions {
  domain?: OdooDomain;
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
}

// Interface pour le client XML-RPC (évite d'importer des types manquants)
// interface XmlRpcClient {
//   methodCall: (
//     method: string, 
//     params: unknown[], 
//     callback: (error: Error | null, value: any) => void
//   ) => void;
// }

// --- INITIALISATION DES CLIENTS ---

const createClient = (urlStr: string) => {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const port = url.port ? parseInt(url.port) : (isHttps ? 443 : 80);
  
  const clientParams = { host: url.hostname, port, path: '/xmlrpc/2/object' };
  const commonParams = { ...clientParams, path: '/xmlrpc/2/common' };
  
  return {
    common: isHttps ? xmlrpc.createSecureClient(commonParams) : xmlrpc.createClient(commonParams),
    object: isHttps ? xmlrpc.createSecureClient(clientParams) : xmlrpc.createClient(clientParams)
  };
};

const clients = createClient(ODOO_URL);

// --- CACHING DE L'UID ---

let uidPromise: Promise<number> | null = null;

const getOdooUid = (): Promise<number> => {
  if (uidPromise) return uidPromise;

  uidPromise = new Promise((resolve, reject) => {
    clients.common.methodCall('authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}], (error, uid) => {
      if (error) {
        uidPromise = null;
        console.error("❌ Odoo Auth Error:", error);
        return reject(error);
      }
      if (typeof uid !== 'number') {
        uidPromise = null;
        return reject(new Error('Authentification Odoo échouée (UID vide ou invalide)'));
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
   * Utilise un générique <T> pour typer le retour
   */
  execute: async <T = unknown>(
    model: string, 
    method: string, 
    args: unknown[] = [], 
    kwargs: Record<string, unknown> = {}
  ): Promise<T> => {
    try {
      const uid = await getOdooUid();
      return new Promise((resolve, reject) => {
        clients.object.methodCall(
          'execute_kw', 
          [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs], 
          (err: object, value: T) => {
            if (err) return reject(err);
            resolve(value);
          }
        );
      });
    } catch (e) {
      throw e;
    }
  },

  /**
   * Helper spécifique pour search_read
   */
  searchRead: async <T = unknown>(
    model: string, 
    options: SearchReadOptions = {}
  ): Promise<T[]> => {
    const { domain = [], fields = [], limit = 0, offset = 0, order = '' } = options;
    return odooClient.execute<T[]>(model, 'search_read', [domain], { 
      fields, 
      limit, 
      offset, 
      order 
    });
  },

  /**
   * Helper pour compter les éléments
   */
  searchCount: async (model: string, domain: OdooDomain = []): Promise<number> => {
    return odooClient.execute<number>(model, 'search_count', [domain]);
  }
};