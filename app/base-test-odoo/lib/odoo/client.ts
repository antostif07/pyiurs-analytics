// lib/odoo.ts
import xmlrpc from 'xmlrpc';

const common = xmlrpc.createClient({ url: `${process.env.ODOO_TEST_URL}/xmlrpc/2/common` });
const object = xmlrpc.createClient({ url: `${process.env.ODOO_TEST_URL}/xmlrpc/2/object` });

const db = process.env.ODOO_TEST_DB as string;
const username = process.env.ODOO_USERNAME as string;
const password = process.env.ODOO_TEST_API_KEY as string;

// Cache pour l'UID utilisateur pour ne pas se re-loguer à chaque requête
let cachedUid: number | null = null;

async function getUid(): Promise<number> {
  if (cachedUid) return cachedUid;
  return new Promise((resolve, reject) => {
    common.methodCall('authenticate', [db, username, password, {}], (err, uid) => {
      if (err) reject(err);
      if (!uid) reject(new Error("Authentification échouée"));
      cachedUid = Number(uid);
      resolve(cachedUid);
    });
  });
}

// Fonction générique pour appeler n'importe quel modèle Odoo
export async function odooCall(model: string, method: string, args: any[], kwargs: any = {}) {
  const uid = await getUid();
  return new Promise((resolve, reject) => {
    object.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });
}