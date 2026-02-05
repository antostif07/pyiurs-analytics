import { parse, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function parseOdooFrenchDate(odooDateStr: string): string {
  try {
    // 1. Nettoyage : Odoo met parfois des espaces insécables ou des points
    // On s'assure que le format est propre pour date-fns
    const cleanDateStr = odooDateStr.toLowerCase().trim();

    // 2. Parsing : 
    // 'd' = jour (11)
    // 'MMM' = mois abrégé avec point (déc.)
    // 'yyyy' = année (2025)
    const parsedDate = parse(cleanDateStr, 'd MMM yyyy', new Date(), { locale: fr });

    // 3. Formatage en ISO pour le JSON (2025-12-11)
    return format(parsedDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error(`Erreur de parsing date: ${odooDateStr}`, error);
    return odooDateStr; // Retourne la string originale en cas d'échec
  }
}