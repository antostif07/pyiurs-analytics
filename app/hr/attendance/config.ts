export const ATTENDANCE_STATUS = {
  present: { label: 'Présent', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: 'Check' },
  absent: { label: 'Absent', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: 'X' },
  late: { label: 'Retard', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: 'Clock' },
  repos: { label: 'Repos', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'Coffee' },
  sick: { label: 'Maladie', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: 'Stethoscope' },
  'congé circonstaciel': { label: 'C. Circons.', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: 'Calendar' },
  'congé non circonstaciel': { label: 'C. Annuel', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: 'Palmtree' },
  suspension: { label: 'Suspension', color: 'bg-gray-900 text-white border-transparent', icon: 'AlertOctagon' },
} as const;