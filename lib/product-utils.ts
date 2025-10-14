export function getNameInProductName(text: string): string {
  // Trouve l'index du premier crochet ouvrant
  const index = text.indexOf("[");
  
  // S'il n'y a pas de crochet, renvoie le texte entier
  if (index === -1) return text.trim();
  
  // Sinon, retourne la partie avant le premier crochet
  return text.substring(0, index).trim();
}