export default function KPIsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-white rounded-[24px] border border-gray-100 p-6 space-y-4">
          <div className="flex justify-between">
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="w-4 h-4 bg-gray-50 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-100 rounded w-1/2" />
            <div className="h-3 bg-gray-50 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}