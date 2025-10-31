import { endOfMonth } from "date-fns";

// Fonction pour obtenir les dates du mois sélectionné
export function getMonthDates(month?: string, year?: string) {
  const now = new Date();
  const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
  const selectedYear = year ? parseInt(year) : now.getFullYear();
  
  const firstDay = new Date(selectedYear, selectedMonth, 1);
  const lastDay = endOfMonth(new Date(selectedYear, selectedMonth + 1, 0));
  
  
  
  const formatDate = (date: Date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };
  
  return {
    firstDay: formatDate(firstDay),
    lastDay: formatDate(lastDay),
    month: selectedMonth,
    year: selectedYear
  };
}

export function getMonthName(monthNumber?: string): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const monthIndex = monthNumber ? parseInt(monthNumber) - 1 : new Date().getMonth();
  return months[monthIndex] || 'Mois inconnu';
}