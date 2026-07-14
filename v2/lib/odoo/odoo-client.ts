// lib/odoo/odoo-client.ts

// Sécurité Staff-Level : Empêche toute fuite de la clé d'API vers le navigateur
if (typeof window !== "undefined") {
  throw new Error("Sécurité : Le client Odoo ne doit être exécuté que côté serveur.");
}

export type OdooDomain = Array<[string, string, unknown] | string>;

interface SearchReadParams {
  domain?: OdooDomain;
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
  context?: Record<string, unknown>;
}

interface OdooResponse<T> {
  result?: T;
  error?: {
    name: string;
    message: string;
    arguments: unknown[];
  };
}

interface ReadGroupParams {
  domain?: OdooDomain;
  fields?: string[];
  groupby?: string[];
  offset?: number;
  limit?: number;
  orderby?: string;
  lazy?: boolean;
  context?: Record<string, unknown>;
}

// Résolution robuste des variables d'environnement (Vite/Vinxi + Node)
const ODOO_URL =
  (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_ODOO_URL : null) ||
  process.env.ODOO_URL ||
  "https://pyiurs.odoo.com";

const ODOO_DB =
  (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_ODOO_DB : null) ||
  process.env.ODOO_DB ||
  "pyiurs";

const ODOO_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_ODOO_API_KEY : null) ||
  process.env.ODOO_API_KEY ||
  "";

async function odooFetch<T>(
  model: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  if (!ODOO_API_KEY) {
    throw new Error("Configuration d'API Odoo manquante : ODOO_API_KEY est requis.");
  }

  const response = await fetch(`${ODOO_URL}/json/2/${model}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Odoo-Database": ODOO_DB,
      Authorization: `Bearer ${ODOO_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} - ${text}`);
  }

  const data = (await response.json()) as OdooResponse<T>;

  // ⚡ CORRECTION : Interception explicite des erreurs internes d'Odoo encapsulées dans un 200 OK
  if (data.error) {
    throw new Error(`Erreur d'exécution Odoo (${data.error.name}) : ${data.error.message}`);
  }

  // Odoo enveloppe généralement sa réponse dans l'objet 'result'
  return (data.result !== undefined ? data.result : data) as T;
}

export const odooClient = {
  async searchRead<T>(model: string, params: SearchReadParams = {}): Promise<T[]> {
    return odooFetch<T[]>(model, "search_read", {
      context: { lang: "fr_FR" },
      domain: params.domain ?? [],
      fields: params.fields ?? [],
      limit: params.limit,
      offset: params.offset,
      order: params.order,
    });
  },

  async searchCount(model: string, domain: OdooDomain = []): Promise<number> {
    return odooFetch<number>(model, "search_count", { domain });
  },

  async create<T extends Record<string, unknown>>(model: string, values: T): Promise<number> {
    return odooFetch<number>(model, "create", values);
  },

  async write<T extends Record<string, unknown>>(model: string, ids: number[], values: T): Promise<boolean> {
    return odooFetch<boolean>(model, "write", { ids, values });
  },

  async readGroup<T>(model: string, params: ReadGroupParams = {}): Promise<T[]> {
    return odooFetch<T[]>(model, "read_group", {
      context: { lang: "fr_FR", ...(params.context ?? {}) },
      domain: params.domain ?? [],
      fields: params.fields ?? [],
      groupby: params.groupby ?? [],
      offset: params.offset,
      limit: params.limit,
      orderby: params.orderby,
      lazy: params.lazy ?? true,
    });
  },
};