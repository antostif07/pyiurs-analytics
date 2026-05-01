import { AttendanceStatus } from "./types";

export const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  'present': { 
    label: 'PRÉSENT', 
    className: 'bg-emerald-500 text-white border-emerald-600' 
  },
  'absent': { 
    label: 'ABSENT', 
    className: 'bg-red-500 text-white border-red-600' 
  },
  'late': { // La clé est 'late' comme en base, le label reste 'RETARD'
    label: 'RETARD', 
    className: 'bg-amber-500 text-white border-amber-600' 
  },
  'repos': { 
    label: 'REPOS', 
    className: 'bg-slate-400 text-white border-slate-500' 
  },
  'congé circonstaciel': { 
    label: 'C. CIRCONS.', 
    className: 'bg-indigo-500 text-white border-indigo-600' 
  },
  'congé non circonstanciel': { 
    label: 'C. NON CIRC.', 
    className: 'bg-pink-500 text-white border-pink-600' 
  },
  'suspension': { 
    label: 'SUSPENSION', 
    className: 'bg-gray-900 text-white border-black' 
  },
  'sick': { // Nouvelle valeur
    label: 'MALADE', 
    className: 'bg-orange-500 text-white border-orange-600' 
  },
};

export const MONTHS = [
  { val: "01", label: "Janvier" }, { val: "02", label: "Février" },
  { val: "03", label: "Mars" }, { val: "04", label: "Avril" },
  { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juillet" }, { val: "08", label: "Août" },
  { val: "09", label: "Septembre" }, { val: "10", label: "Octobre" },
  { val: "11", label: "Novembre" }, { val: "12", label: "Décembre" }
];