// app/hr/attendance/_components/StatusBadge.tsx

import { Badge } from '@/components/ui/badge'
import { AttendanceStatus } from '../types'
import { STATUS_CONFIG } from '../../utils'

export default function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config =
    STATUS_CONFIG[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-400',
    }

  return (
    <Badge className={`${config.className} text-[8px] font-black px-2 py-0.5 rounded-full uppercase`}>
      {config.label}
    </Badge>
  )
}