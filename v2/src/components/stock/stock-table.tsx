export function StockTable() {
    return (
        <div
            className="
      bg-white
      rounded-2xl
      border
      overflow-hidden
    "
        >
            <table
                className="
        w-full
        text-sm
      "
            >
                <thead>

                    <tr className="bg-gray-50">

                        <th className="p-5">
                            Product
                        </th>

                        <th>
                            Stock
                        </th>

                        <th>
                            Threshold
                        </th>

                        <th>
                            Status
                        </th>

                    </tr>

                </thead>

                <tbody>

                    <tr>

                        <td className="p-5">
                            Apples
                        </td>

                        <td>
                            50
                        </td>

                        <td>
                            100
                        </td>

                        <td className="text-green-500">
                            Reordering
                        </td>

                    </tr>

                </tbody>

            </table>
        </div>
    )
}