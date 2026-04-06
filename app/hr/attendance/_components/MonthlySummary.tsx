// app/hr/attendance/_components/MonthlySummary.tsx

import { Card } from '@/components/ui/card'
import { Attendance, AttendanceStatus } from '../types'
import { STATUS_CONFIG } from '../../utils'

export default function MonthlySummary({
  attendances,
}: {
  attendances: Attendance[]
}) {
  const stats = (Object.keys(STATUS_CONFIG) as AttendanceStatus[]).reduce(
    (acc, key) => {
      acc[key] = attendances.filter(
        (a) => (a.is_validated ? a.validated_status : a.status) === key
      ).length
      return acc
    },
    {} as Record<AttendanceStatus, number>
  )

  return (
    <Card className="p-6 bg-gray-900 text-white rounded-3xl">
      <h3 className="font-bold mb-4">Synthèse</h3>
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k}>
            <p className="text-xs">{k}</p>
            <p className="font-bold">{v}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}