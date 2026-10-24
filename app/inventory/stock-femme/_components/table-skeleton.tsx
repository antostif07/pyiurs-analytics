// app/inventory/stock-femme/_components/table-skeleton.tsx

export function TableSkeleton() {
    return (
        <div className="p-4">
            <div className="space-y-3">
                <div className="flex space-x-4 animate-pulse">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-6 bg-muted/40 rounded flex-1"
                        />
                    ))}
                </div>
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex space-x-4 animate-pulse">
                        {Array.from({ length: 7 }).map((_, cellIndex) => (
                            <div
                                key={cellIndex}
                                className={`h-12 bg-muted/30 rounded ${cellIndex === 0 ? "flex-[2]" : "flex-1"
                                    }`}
                            />
                        ))}
                    </div>
                ))}
                <div className="flex justify-end space-x-2 pt-4 animate-pulse">
                    <div className="h-8 w-20 bg-muted/40 rounded" />
                    <div className="h-8 w-20 bg-muted/40 rounded" />
                </div>
            </div>
        </div>
    );
}