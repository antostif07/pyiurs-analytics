import xmlrpc from 'xmlrpc';

const ODOO_URL = 'https://pyiurs.odoo.com'
const ODOO_DB = 'pyiurs';
const ODOO_USERNAME = process.env.ODOO_USERNAME || 'arnold.bopeto@pyiurs.com';
const ODOO_PASSWORD = process.env.ODOO_PASSWORD || '';

// Fonction générique pour se connecter à Odoo
export const odooClient = async (model: string, method: string, args: any[] = [], kwargs: any = {}) => {
  const common = xmlrpc.createClient({ url: `${ODOO_URL}/xmlrpc/2/common` });
  
  return new Promise((resolve, reject) => {
    // 1. Authentification (récupération de l'UID)
    common.methodCall('authenticate', [ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD, {}], (error, uid) => {
      if (error) return reject(error);
      if (!uid) return reject(new Error('Authentification Odoo échouée'));

      // 2. Exécution de la commande sur le modèle (ex: sale.order, product.template)
      const object = xmlrpc.createClient({ url: `${ODOO_URL}/xmlrpc/2/object` });
      
      object.methodCall('execute_kw', [ODOO_DB, uid, ODOO_PASSWORD, model, method, args, kwargs], (err, value) => {
        if (err) return reject(err);
        resolve(value);
      });
    });
  });
};

/** 
 * EXEMPLE : Récupérer le CA du jour
 * model: 'sale.order'
 * domain: [['date_order', '>=', today], ['state', 'in', ['sale', 'done']]]
 */