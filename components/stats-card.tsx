const StatCard = ({ title, value, type }: { title: string, value: string, type: 'revenue' | 'expense' | 'profit' | 'margin' }) => {
  const styles = {
    revenue: "bg-go-green-bg text-go-green-text icon-bg-green-200",
    expense: "bg-go-red-bg text-go-red-text icon-bg-red-200",
    profit: "bg-go-purple-bg text-indigo-600 icon-bg-indigo-200",
    margin: "bg-go-blue-bg text-blue-600 icon-bg-blue-200"
  };

  return (
    <div className={`${styles[type].split(' ')[0]} rounded-go p-8 flex-1 min-w-[240px]`}>
      <div className="flex items-center gap-3 mb-4 text-go-text-light">
        <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs opacity-80">$</span>
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-gray-800">
        {value}
      </div>
    </div>
  );
};