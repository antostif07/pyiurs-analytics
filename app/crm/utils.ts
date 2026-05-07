export const formatPhoneDisplay = (phone: string | false | null): string => {
  if (!phone) return "NON RENSEIGNÉ";
  let cleaned = phone.toString().replace(/\D/g, "");
  // On extrait les 9 derniers chiffres
  let local = cleaned.slice(-9);
  if (local.length < 9) return phone.toString(); // Fallback si numéro bizarre
  // Formatage propre : +243 891 234 567
  return `+243 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
};