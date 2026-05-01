import { AttendanceStatus } from "@/lib/supabase/types";

export function formatExcelTime(value: any): string | null {
  if (!value || value === "") return null;
  if (typeof value === 'string' && value.includes(':')) return value;
  if (typeof value === 'number') {
    const totalSeconds = Math.round(value * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return null;
}

export function getInitialStatus(time: string | null, date: Date): AttendanceStatus {
  if (!time) {
    // Si dimanche -> Repos, sinon -> Absent
    return date.getDay() === 0 ? "repos" : "absent";
  }
  // Seuil de retard à 09:01
  return time > "09:01" ? "late" : "present";
}