// lib/phone-normalization.ts
export class PhoneNormalizer {
  /**
   * Normalise un numéro de téléphone vers un format standard
   */
  static normalize(phone: string): string {
    if (!phone) return '';

    // 1. Supprimer tous les caractères non numériques
    let cleaned = phone.replace(/\D/g, '');

    // 2. Gérer les préfixes internationaux
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.replace('00', '');
    }

    // 3. Ajouter le préfixe international pour la RDC (+243) si manquant
    if (cleaned.startsWith('243')) {
      // Déjà au format international
      cleaned = cleaned;
    } else if (cleaned.startsWith('0')) {
      // Format local RDC (0XX XXX XXXX) → +243XX XXXXXX
      cleaned = '243' + cleaned.substring(1);
    } else if (cleaned.length === 9 && !cleaned.startsWith('243')) {
      // Format sans le 0 initial (XX XXX XXXX) → +243XX XXXXXX
      cleaned = '243' + cleaned;
    }

    // 4. Formater en groupes pour une meilleure lisibilité
    if (cleaned.startsWith('243') && cleaned.length === 12) {
      // Format: +243 XX XXX XXXX
      return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    }

    return cleaned ? `+${cleaned}` : '';
  }

  /**
   * Vérifie si un numéro est valide pour la RDC
   */
  static isValidRDCCongo(phone: string): boolean {
    const normalized = this.normalize(phone);
    
    // Doit commencer par +243 et avoir 12 chiffres au total
    if (!normalized.startsWith('+243')) return false;
    
    // Vérifier la longueur (+243 = 4 caractères + 9 chiffres = 13)
    if (normalized.replace(/\D/g, '').length !== 12) return false;
    
    // Vérifier le préfixe opérateur (82, 83, 84, 85, 89, 90, 91, 97, 98, 99)
    const operatorCode = normalized.substring(4, 6);
    const validOperators = ['81','82', '83', '84', '85','86','88', '89', '90', '91', '97', '98', '99'];
    
    return validOperators.includes(operatorCode);
  }

  /**
   * Extrait la clé unique pour le regroupement (sans formatage)
   */
  static getGroupKey(phone: string): string {
    const normalized = this.normalize(phone);
    return normalized.replace(/\D/g, ''); // Retourne uniquement les chiffres
  }

  /**
   * Compare deux numéros pour voir s'ils représentent le même téléphone
   */
  static areSame(phone1: string, phone2: string): boolean {
    return this.getGroupKey(phone1) === this.getGroupKey(phone2);
  }
}