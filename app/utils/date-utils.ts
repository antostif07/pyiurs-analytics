// utils/date-utils.ts

/**
 * Récupère le premier et dernier jour du mois
 * @param month Numéro du mois (1-12)
 * @param year Année (ex: "2024")
 * @returns Objet avec firstDay et lastDay au format YYYY-MM-DD
 */
export function getMonthDateRange(month: string, year: string): { firstDay: string; lastDay: string } {
  if (!month || !year) {
    return { firstDay: '', lastDay: '' };
  }

  const monthNumber = parseInt(month);
  const yearNumber = parseInt(year);

  // Validation des paramètres
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error('Le mois doit être entre 1 et 12');
  }

  if (yearNumber < 1970 || yearNumber > 2100) {
    throw new Error('L\'année doit être entre 1970 et 2100');
  }

  // Premier jour du mois (1 du mois)
  const firstDay = new Date(yearNumber, monthNumber - 1, 1);
  
  // Dernier jour du mois (0 du mois suivant donne le dernier jour du mois actuel)
  const lastDay = new Date(yearNumber, monthNumber, 0);

  // Format YYYY-MM-DD pour l'API
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    firstDay: formatDate(firstDay),
    lastDay: formatDate(lastDay)
  };
}

/**
 * Formate une date YYYY-MM-DD en format français DD/MM/YYYY
 */
export function formatDateFrench(date: string): string {
  if (!date) return '';
  
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Récupère le nom du mois à partir de son numéro
 */
export function getMonthName(monthNumber: string): string {
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  const index = parseInt(monthNumber) - 1;
  return months[index] || '';
}

/**
 * Récupère le numéro du mois à partir de son nom
 */
export function getMonthNumber(monthName: string): string {
  const months: { [key: string]: string } = {
    "janvier": "1",
    "février": "2",
    "mars": "3",
    "avril": "4",
    "mai": "5",
    "juin": "6",
    "juillet": "7",
    "août": "8",
    "septembre": "9",
    "octobre": "10",
    "novembre": "11",
    "décembre": "12"
  };
  
  return months[monthName.toLowerCase()] || '';
}

/**
 * Vérifie si une date est valide
 */
export function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Récupère la date actuelle au format YYYY-MM-DD
 */
export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Récupère le mois et l'année actuels
 */
export function getCurrentMonthAndYear(): { month: string; year: string } {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear())
  };
}

/**
 * Formate une date en français avec le nom du mois
 */
export function formatDateLongFrench(date: string): string {
  if (!date) return '';
  
  const [year, month, day] = date.split('-');
  const monthNames = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];
  
  const monthIndex = parseInt(month) - 1;
  return `${parseInt(day)} ${monthNames[monthIndex]} ${year}`;
}

/**
 * Calcule la différence en jours entre deux dates
 */
export function getDaysDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Ajoute des jours à une date
 */
export function addDays(date: string, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Soustrait des jours à une date
 */
export function subtractDays(date: string, days: number): string {
  return addDays(date, -days);
}

/**
 * Récupère le premier jour de l'année
 */
export function getFirstDayOfYear(year: string): string {
  return `${year}-01-01`;
}

/**
 * Récupère le dernier jour de l'année
 */
export function getLastDayOfYear(year: string): string {
  return `${year}-12-31`;
}

/**
 * Récupère le trimestre d'une date
 */
export function getQuarter(date: string): number {
  const month = new Date(date).getMonth() + 1;
  return Math.ceil(month / 3);
}

/**
 * Récupère le premier et dernier jour du trimestre
 */
export function getQuarterDateRange(year: string, quarter: number): { firstDay: string; lastDay: string } {
  const firstMonth = (quarter - 1) * 3 + 1;
  const lastMonth = firstMonth + 2;
  
  const firstDay = new Date(parseInt(year), firstMonth - 1, 1);
  const lastDay = new Date(parseInt(year), lastMonth, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    firstDay: formatDate(firstDay),
    lastDay: formatDate(lastDay)
  };
}

// Données des mois pour les selects
export const months = [
  { name: "Janvier", value: "1" },
  { name: "Février", value: "2" },
  { name: "Mars", value: "3" },
  { name: "Avril", value: "4" },
  { name: "Mai", value: "5" },
  { name: "Juin", value: "6" },
  { name: "Juillet", value: "7" },
  { name: "Août", value: "8" },
  { name: "Septembre", value: "9" },
  { name: "Octobre", value: "10" },
  { name: "Novembre", value: "11" },
  { name: "Décembre", value: "12" }
];

// Génération des années
export const getYears = (): string[] => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 51 }, (_, i) => (currentYear - i).toString());
};

// Liste des trimestres
export const quarters = [
  { name: "1er trimestre", value: "1" },
  { name: "2ème trimestre", value: "2" },
  { name: "3ème trimestre", value: "3" },
  { name: "4ème trimestre", value: "4" }
];

/**
 * Récupère la semaine d'une date (format ISO)
 */
export function getWeekNumber(date: string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * Récupère le premier et dernier jour de la semaine
 */
export function getWeekDateRange(year: string, week: string): { firstDay: string; lastDay: string } {
  const simple = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekEnd.getDate() + 6);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    firstDay: formatDate(ISOweekStart),
    lastDay: formatDate(ISOweekEnd)
  };
}