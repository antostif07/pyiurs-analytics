export default function Loading() {
  return (
    <div className="min-h-screen pb-10 animate-pulse">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded-lg" />
          <div className="mt-2 h-4 w-40 bg-gray-200 rounded" />
        </div>

        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* FILTRES (mois / année) */}
      <div className="flex gap-4 mb-8">
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* TABLE SKELETON */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
          <div className="h-10 bg-gray-200 rounded-lg w-64" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="h-8 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
