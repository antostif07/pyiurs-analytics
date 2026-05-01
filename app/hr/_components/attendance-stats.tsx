export function AttendanceStats({ data }: { data: any[] }) {
  const stats = {
    present: data.filter(a => (a.validated_status || a.status) === 'present').length,
    late: data.filter(a => (a.validated_status || a.status) === 'late').length,
    absent: data.filter(a => (a.validated_status || a.status) === 'absent').length,
    pending: data.filter(a => !a.is_validated).length,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
        { label: "Présents", val: stats.present, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Retards", val: stats.late, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Absents", val: stats.absent, color: "text-rose-600", bg: "bg-rose-50" },
        { label: "À Valider", val: stats.pending, color: "text-blue-600", bg: "bg-blue-50" },
      ].map((s, i) => (
        <div key={i} className={`p-4 rounded-2xl border-none shadow-sm ${s.bg}`}>
          <p className="text-xs font-bold uppercase opacity-60">{s.label}</p>
          <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
        </div>
      ))}
    </div>
  );
}