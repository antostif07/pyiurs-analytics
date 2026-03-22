export function LevelCard({ value, label, bg, text, sub }: any) {
  return (
    <div className={`text-center p-2 rounded-lg ${bg}`}>
      <div className={`text-lg font-bold ${text}`}>{value}</div>
      <div className={`text-xs ${sub}`}>{label}</div>
    </div>
  );
}